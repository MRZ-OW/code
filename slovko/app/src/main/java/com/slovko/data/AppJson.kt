package com.slovko.data

import kotlinx.serialization.json.Json

/** Shared lenient JSON for seeding and for stored JSON columns. */
val AppJson: Json = Json {
    ignoreUnknownKeys = true
    isLenient = true
    coerceInputValues = true
    encodeDefaults = true
}
