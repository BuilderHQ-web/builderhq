package au.com.builderhq.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/** Application entry point + Hilt's DI root. */
@HiltAndroidApp
class BuilderHqApp : Application()
