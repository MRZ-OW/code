package com.slovko.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.slovko.core.designsystem.component.NodeState
import com.slovko.domain.model.CurriculumUnit
import com.slovko.domain.model.DailyGoal
import com.slovko.domain.model.UserStats
import com.slovko.domain.repository.ContentRepository
import com.slovko.domain.repository.ProgressRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

/** A single skill rendered as a node on the winding path. */
data class SkillNodeUi(
    val skillId: String,
    val title: String,
    val iconKey: String,
    val nodeState: NodeState,
    val progress: Float,
    val nextLessonId: String?,
)

/** A unit header followed by its skill nodes. */
data class UnitSectionUi(
    val unitId: String,
    val name: String,
    val cefr: String,
    val skills: List<SkillNodeUi>,
)

sealed interface HomeUiState {
    data object Loading : HomeUiState
    data class Data(
        val stats: UserStats,
        val goal: DailyGoal,
        val units: List<UnitSectionUi>,
    ) : HomeUiState
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    content: ContentRepository,
    progress: ProgressRepository,
) : ViewModel() {

    val state: StateFlow<HomeUiState> = combine(
        content.observeUnits(),
        progress.observeCompletedLessons(),
        progress.observeUserStats(),
        progress.observeDailyGoal(),
    ) { units, completed, stats, goal ->
        HomeUiState.Data(
            stats = stats,
            goal = goal,
            units = buildSections(units, completed),
        )
    }.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5000),
        HomeUiState.Loading,
    )

    private fun buildSections(
        units: List<CurriculumUnit>,
        completed: Set<String>,
    ): List<UnitSectionUi> {
        // Walk all skills in unit/order sequence. The first non-complete skill
        // overall is AVAILABLE; everything after it is LOCKED.
        var availableAssigned = false

        val orderedUnits = units.sortedBy { it.order }
        return orderedUnits.map { unit ->
            val orderedSkills = unit.skills.sortedBy { it.orderIndex }
            val nodes = orderedSkills.map { skill ->
                val lessons = skill.lessons.sortedBy { it.orderIndex }
                val total = lessons.size
                val completedCount = lessons.count { it.id in completed }
                val allComplete = total > 0 && completedCount == total

                val nextLessonId = lessons.firstOrNull { it.id !in completed }?.id
                    ?: lessons.firstOrNull()?.id

                val nodeState = when {
                    allComplete -> NodeState.COMPLETE
                    !availableAssigned -> {
                        availableAssigned = true
                        NodeState.AVAILABLE
                    }
                    else -> NodeState.LOCKED
                }

                SkillNodeUi(
                    skillId = skill.id,
                    title = skill.title,
                    iconKey = skill.iconKey,
                    nodeState = nodeState,
                    progress = if (total <= 0) 0f else completedCount.toFloat() / total,
                    nextLessonId = nextLessonId,
                )
            }
            UnitSectionUi(
                unitId = unit.id,
                name = unit.name,
                cefr = unit.cefr,
                skills = nodes,
            )
        }
    }
}
