package com.slovko.domain.srs

/**
 * FSRS-4.5 parameters. Pure data; no Android. See DESIGN.md §4.
 * Weights are the published FSRS-4.5 defaults (good general-purpose prior).
 */
data class FsrsParams(
    val w: DoubleArray = DEFAULT_W,
    val requestRetention: Double = 0.90, // user-adjustable 0.85..0.95
    val maximumIntervalDays: Double = 3650.0,
    val learningStepsMinutes: List<Int> = listOf(1, 10),
    val relearningStepMinutes: Int = 10,
) {
    val decay: Double get() = -0.5
    val factor: Double get() = Math.pow(0.9, 1.0 / decay) - 1.0 // = 19/81

    companion object {
        val DEFAULT_W = doubleArrayOf(
            0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234,
            1.616, 0.1544, 1.0824, 1.9813, 0.0953, 0.2975, 2.2042, 0.2407,
            2.9466, 0.5034, 0.6567,
        )
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is FsrsParams) return false
        return w.contentEquals(other.w) &&
            requestRetention == other.requestRetention &&
            maximumIntervalDays == other.maximumIntervalDays &&
            learningStepsMinutes == other.learningStepsMinutes &&
            relearningStepMinutes == other.relearningStepMinutes
    }

    override fun hashCode(): Int = w.contentHashCode() * 31 + requestRetention.hashCode()
}
