package com.guardrail.ragebait.classify

/**
 * Prebuilt "topic" blocklists that can be toggled as a unit. These are
 * starting points — the custom word list in the app is where per-person
 * tuning happens, and the 😤 button learns the rest.
 */
object TopicPacks {

    data class Pack(val id: String, val title: String, val terms: List<String>)

    val ALL: List<Pack> = listOf(
        Pack(
            id = "engagement_bait",
            title = "Engagement bait",
            terms = listOf(
                "rage bait", "ragebait", "you won't believe", "wait for it",
                "don't scroll", "am i wrong", "am i the only one",
                "unpopular opinion", "hot take", "this will make you angry",
                "tell me why", "let that sink in", "i said what i said",
                "fight me", "come at me", "triggered",
            ),
        ),
        Pack(
            id = "gender_wars",
            title = "Gender wars / dating drama",
            terms = listOf(
                "gender war", "red pill", "redpill", "alpha male",
                "high value man", "high value woman", "gold digger",
                "men vs women", "women vs men", "all men", "all women",
                "double standards", "divorce court", "cheating story",
                "toxic masculinity", "female nature", "body count",
            ),
        ),
        Pack(
            id = "outrage_politics",
            title = "Outrage politics",
            terms = listOf(
                "woke", "anti-woke", "leftist", "right-winger", "libs owned",
                "destroyed with facts", "snowflake", "cancel culture",
                "culture war", "political correctness", "outraged",
                "boycott", "banned for telling the truth",
            ),
        ),
    )

    fun byId(id: String): Pack? = ALL.firstOrNull { it.id == id }

    /** Union of terms for the enabled pack ids. */
    fun termsFor(enabledIds: Set<String>): List<String> =
        ALL.filter { it.id in enabledIds }.flatMap { it.terms }
}
