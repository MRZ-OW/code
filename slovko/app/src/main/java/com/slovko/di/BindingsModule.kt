package com.slovko.di

import com.slovko.data.ai.ChatPartner
import com.slovko.data.ai.RemoteChatPartner
import com.slovko.data.audio.PronunciationPlayer
import com.slovko.data.audio.TtsManager
import com.slovko.data.repository.ChatRepositoryImpl
import com.slovko.data.repository.ContentRepositoryImpl
import com.slovko.data.repository.GamificationRepositoryImpl
import com.slovko.data.repository.ProgressRepositoryImpl
import com.slovko.data.repository.SettingsRepositoryImpl
import com.slovko.data.repository.SrsRepositoryImpl
import com.slovko.domain.repository.ChatRepository
import com.slovko.domain.repository.ContentRepository
import com.slovko.domain.repository.GamificationRepository
import com.slovko.domain.repository.ProgressRepository
import com.slovko.domain.repository.SettingsRepository
import com.slovko.domain.repository.SrsRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class BindingsModule {

    @Binds @Singleton
    abstract fun bindContentRepository(impl: ContentRepositoryImpl): ContentRepository

    @Binds @Singleton
    abstract fun bindSrsRepository(impl: SrsRepositoryImpl): SrsRepository

    @Binds @Singleton
    abstract fun bindProgressRepository(impl: ProgressRepositoryImpl): ProgressRepository

    @Binds @Singleton
    abstract fun bindGamificationRepository(impl: GamificationRepositoryImpl): GamificationRepository

    @Binds @Singleton
    abstract fun bindChatRepository(impl: ChatRepositoryImpl): ChatRepository

    @Binds @Singleton
    abstract fun bindSettingsRepository(impl: SettingsRepositoryImpl): SettingsRepository

    @Binds @Singleton
    abstract fun bindPronunciationPlayer(impl: TtsManager): PronunciationPlayer

    @Binds @Singleton
    abstract fun bindChatPartner(impl: RemoteChatPartner): ChatPartner
}
