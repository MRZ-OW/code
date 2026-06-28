package com.slovko.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStoreFile
import androidx.room.Room
import com.slovko.core.common.AppClock
import com.slovko.core.common.DefaultDispatcher
import com.slovko.core.common.IoDispatcher
import com.slovko.core.common.SystemClock
import com.slovko.data.db.SlovkoDatabase
import com.slovko.data.db.dao.ChatDao
import com.slovko.data.db.dao.ContentDao
import com.slovko.data.db.dao.GamificationDao
import com.slovko.data.db.dao.ProgressDao
import com.slovko.data.db.dao.SrsDao
import com.slovko.domain.league.LeagueEngine
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ProvidersModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SlovkoDatabase =
        Room.databaseBuilder(context, SlovkoDatabase::class.java, SlovkoDatabase.NAME)
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun contentDao(db: SlovkoDatabase): ContentDao = db.contentDao()
    @Provides fun srsDao(db: SlovkoDatabase): SrsDao = db.srsDao()
    @Provides fun progressDao(db: SlovkoDatabase): ProgressDao = db.progressDao()
    @Provides fun gamificationDao(db: SlovkoDatabase): GamificationDao = db.gamificationDao()
    @Provides fun chatDao(db: SlovkoDatabase): ChatDao = db.chatDao()

    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(
            produceFile = { context.preferencesDataStoreFile("slovko_settings") },
        )

    @Provides @Singleton fun provideClock(): AppClock = SystemClock()

    @Provides @Singleton fun provideLeagueEngine(): LeagueEngine = LeagueEngine()

    @Provides @IoDispatcher fun ioDispatcher(): CoroutineDispatcher = Dispatchers.IO
    @Provides @DefaultDispatcher fun defaultDispatcher(): CoroutineDispatcher = Dispatchers.Default
}
