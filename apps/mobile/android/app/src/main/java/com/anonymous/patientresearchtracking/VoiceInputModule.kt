package com.anonymous.patientresearchtracking

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class VoiceInputModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private var pendingPromise: Promise? = null

  private val activityEventListener: ActivityEventListener =
    object : BaseActivityEventListener() {
      override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
      ) {
        if (requestCode != VOICE_INPUT_REQUEST_CODE) {
          return
        }

        val promise = pendingPromise ?: return
        pendingPromise = null

        if (resultCode != Activity.RESULT_OK) {
          promise.reject("canceled", "Voice input was canceled.")
          return
        }

        val results = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        val transcript = results?.firstOrNull()?.trim().orEmpty()
        if (transcript.isBlank()) {
          promise.reject("no_transcript", "Voice input did not return a transcript.")
          return
        }

        promise.resolve(transcript)
      }
    }

  init {
    reactContext.addActivityEventListener(activityEventListener)
  }

  override fun getName(): String = "VoiceInput"

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SpeechRecognizer.isRecognitionAvailable(reactContext))
  }

  @ReactMethod
  fun start(localeTag: String, prompt: String, promise: Promise) {
    if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
      promise.reject("unavailable", "Speech recognition is not available on this device.")
      return
    }

    val activity = getCurrentActivity()
    if (activity == null) {
      promise.reject("no_activity", "Voice input cannot start without an active screen.")
      return
    }

    if (pendingPromise != null) {
      promise.reject("busy", "Voice input is already running.")
      return
    }

    val normalizedLocale = localeTag.ifBlank { Locale.getDefault().toLanguageTag() }
    val intent =
      Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, normalizedLocale)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, normalizedLocale)
        putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, normalizedLocale)
        putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
      }

    pendingPromise = promise
    try {
      activity.startActivityForResult(intent, VOICE_INPUT_REQUEST_CODE)
    } catch (error: ActivityNotFoundException) {
      pendingPromise = null
      promise.reject("unavailable", "Speech recognition is not available on this device.", error)
    }
  }

  companion object {
    private const val VOICE_INPUT_REQUEST_CODE = 4207
  }
}
