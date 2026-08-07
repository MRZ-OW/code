import numpy as np

from voicebridge import dsp


def test_equal_power_fades_sum_to_one():
    fi, fo = dsp.equal_power_fades(256)
    energy = fi**2 + fo**2
    assert np.allclose(energy, 1.0, atol=1e-5)
    assert fi[0] == 0.0 and abs(fi[-1] - 1.0) < 1e-6
    assert abs(fo[0] - 1.0) < 1e-6 and abs(fo[-1]) < 1e-6


def test_equal_power_fades_zero_length():
    fi, fo = dsp.equal_power_fades(0)
    assert fi.size == 0 and fo.size == 0


def test_crossfade_endpoints():
    n = 128
    a = np.ones(n, dtype=np.float32)        # previous tail
    b = np.full(n, 0.5, dtype=np.float32)   # new head
    out = dsp.crossfade(a, b)
    # start ~= prev value, end ~= new value
    assert abs(out[0] - 1.0) < 1e-3
    assert abs(out[-1] - 0.5) < 1e-3
    assert out.dtype == np.float32


def test_crossfade_shape_mismatch_raises():
    try:
        dsp.crossfade(np.zeros(4), np.zeros(5))
    except ValueError:
        return
    raise AssertionError("expected ValueError on mismatched crossfade regions")


def test_resample_length_and_identity():
    x = np.random.randn(16000).astype(np.float32)
    assert np.array_equal(dsp.resample(x, 16000, 16000), x)
    y = dsp.resample(x, 16000, 8000)
    assert abs(len(y) - 8000) <= 2


def test_rms_and_dbfs():
    assert dsp.rms(np.zeros(100)) == 0.0
    full = np.ones(100, dtype=np.float32)
    assert abs(dsp.rms(full) - 1.0) < 1e-6
    assert abs(dsp.dbfs(full) - 0.0) < 1e-6
    assert dsp.dbfs(np.zeros(10)) == float("-inf")


def test_noise_gate_silences_quiet_block():
    quiet = np.full(1000, 1e-4, dtype=np.float32)
    assert np.all(dsp.noise_gate(quiet, threshold_db=-45.0) == 0.0)
    loud = np.full(1000, 0.5, dtype=np.float32)
    assert np.allclose(dsp.noise_gate(loud, threshold_db=-45.0), loud)


def test_soft_clip_bounds():
    x = np.array([-5.0, 0.0, 5.0], dtype=np.float32)
    out = dsp.soft_clip(x)
    assert np.all(np.abs(out) < 1.0)


def test_pitch_shift_preserves_length():
    x = np.random.randn(4000).astype(np.float32)
    out = dsp.pitch_shift_naive(x, -4.0)
    assert len(out) == len(x)
    assert np.array_equal(dsp.pitch_shift_naive(x, 0.0), x)
