package com.slovko.core.designsystem

/** Maps content/skill/achievement icon keys to emoji glyphs (no asset pipeline needed). */
object IconKeys {
    private val map = mapOf(
        "wave" to "👋", "coffee" to "☕", "chat" to "💬", "star" to "⭐", "home" to "🏠",
        "family" to "👨‍👩‍👧", "food" to "🍽️", "city" to "🏙️", "clock" to "🕐", "calendar" to "📅",
        "shop" to "🛍️", "weather" to "🌤️", "work" to "💼", "travel" to "🧳", "sound" to "🔊",
        "book" to "📖", "person" to "🧑", "heart" to "❤️", "flame" to "🔥", "gem" to "💎",
        "trophy" to "🏆", "target" to "🎯", "mic" to "🎤", "ear" to "👂", "run" to "🏃",
        "friends" to "🤝", "up" to "⬆️", "moon" to "🌙", "sunrise" to "🌅", "spark" to "✨",
        "number" to "🔢", "pet" to "🐶", "money" to "💶", "pub" to "🍺", "phone" to "📱",
    )
    operator fun get(key: String?): String = map[key] ?: "⭐"
}
