package com.slovko.core.common

import java.time.LocalDate
import java.time.ZoneId

/** Injectable clock so time-dependent logic is unit-testable. */
interface AppClock {
    fun nowMillis(): Long
    fun zone(): ZoneId
    fun today(): LocalDate
}

class SystemClock : AppClock {
    override fun nowMillis(): Long = System.currentTimeMillis()
    override fun zone(): ZoneId = ZoneId.systemDefault()
    override fun today(): LocalDate = LocalDate.now(zone())
}
