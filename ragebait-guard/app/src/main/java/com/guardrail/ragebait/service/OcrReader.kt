package com.guardrail.ragebait.service

import android.accessibilityservice.AccessibilityService
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.Display
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.guardrail.ragebait.data.Logs
import java.util.concurrent.Executors

/**
 * Screenshots the current display via the accessibility API and runs
 * on-device ML Kit text recognition over it. This catches text *baked into
 * the video frames* — the classic rage-bait headline overlay — which never
 * appears in accessibility nodes.
 *
 * Everything runs on-device; the pixels never leave the phone. Only the
 * recognized *text* is (optionally) sent to the AI judge afterwards.
 */
class OcrReader {

    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val executor = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    /**
     * Invokes [onResult] on the main thread with recognized text, or null
     * when OCR isn't possible (pre-Android 11, screenshot throttled, etc.).
     * Callers treat null as "proceed without OCR".
     */
    fun read(service: AccessibilityService, onResult: (String?) -> Unit) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            onResult(null)
            return
        }

        try {
            takeScreenshot(service, onResult)
        } catch (t: Throwable) {
            Logs.e("OcrReader", "takeScreenshot threw", t)
            onResult(null)
        }
    }

    private fun takeScreenshot(service: AccessibilityService, onResult: (String?) -> Unit) {
        service.takeScreenshot(
            Display.DEFAULT_DISPLAY,
            executor,
            object : AccessibilityService.TakeScreenshotCallback {
                override fun onSuccess(result: AccessibilityService.ScreenshotResult) {
                    // Runs on our executor: do the expensive hardware-buffer →
                    // software-bitmap copy off the main thread.
                    val bitmap = try {
                        Bitmap.wrapHardwareBuffer(result.hardwareBuffer, result.colorSpace)
                            ?.copy(Bitmap.Config.ARGB_8888, false)
                    } catch (_: Exception) {
                        null
                    } finally {
                        result.hardwareBuffer.close()
                    }
                    if (bitmap == null) {
                        mainHandler.post { onResult(null) }
                        return
                    }
                    recognizer.process(InputImage.fromBitmap(bitmap, 0))
                        .addOnSuccessListener { onResult(it.text) }
                        .addOnFailureListener { onResult(null) }
                        .addOnCompleteListener { bitmap.recycle() }
                }

                override fun onFailure(errorCode: Int) {
                    // Screenshot API is rate-limited (~1/s); just proceed
                    // without OCR this round.
                    mainHandler.post { onResult(null) }
                }
            },
        )
    }
}
