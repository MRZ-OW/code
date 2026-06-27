package com.slovko.domain

/** The 15 achievements (DESIGN.md §7). Seeded once; progress tracked at runtime. */
object AchievementsCatalog {

    data class Def(
        val id: String,
        val title: String,
        val description: String,
        val iconKey: String,
        val threshold: Int,
        val tier: Int,
    )

    val ALL: List<Def> = listOf(
        Def("prve_slovo", "Prvé slovo", "Finish your very first lesson.", "spark", 1, 1),
        Def("ranne_vtaca", "Ranné vtáča", "Practice before 9am.", "sunrise", 1, 1),
        Def("nocna_sova", "Nočná sova", "Practice after 10pm.", "moon", 1, 1),
        Def("bezchybny", "Bezchybný", "Complete 25 perfect lessons.", "target", 25, 2),
        Def("ohnivak", "Ohnivák", "Reach a 30-day streak.", "flame", 30, 2),
        Def("ukecany", "Ukecaný", "Finish 10 chat conversations.", "chat", 10, 2),
        Def("dobre_ucho", "Dobré ucho", "Get 100 listening exercises right.", "ear", 100, 2),
        Def("hlas_naroda", "Hlas národa", "Complete 50 speaking exercises.", "mic", 50, 2),
        Def("slovnik", "Slovník", "Learn 500 words.", "book", 500, 3),
        Def("maratonec", "Maratónec", "Earn 5000 total XP.", "run", 5000, 3),
        Def("tyzden_vitazstva", "Týždeň víťazstva", "Hit your daily goal 7 days in a row.", "trophy", 7, 2),
        Def("povyseny", "Povýšený", "Get promoted in a league.", "up", 1, 2),
        Def("verny", "Verný", "Reach a 100-day streak.", "heart", 100, 3),
        Def("zberatel", "Zberateľ", "Collect 1000 gems.", "gem", 1000, 2),
        Def("kamarat", "Kamarát", "Finish the Chat-with-Friends unit.", "friends", 1, 3),
    )
}
