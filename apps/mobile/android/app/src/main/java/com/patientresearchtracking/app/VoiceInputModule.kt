package com.patientresearchtracking.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class VoiceInputModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var pendingPromise: Promise? = null
  private var speechRecognizer: SpeechRecognizer? = null

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

    if (pendingPromise != null) {
      promise.reject("busy", "Voice input is already running.")
      return
    }

    pendingPromise = promise
    mainHandler.post {
      startRecognizer(localeTag, prompt)
    }
  }

  override fun invalidate() {
    super.invalidate()
    mainHandler.post {
      cleanupRecognizer()
      pendingPromise?.reject("canceled", "Voice input was canceled.")
      pendingPromise = null
    }
  }

  private fun startRecognizer(localeTag: String, prompt: String) {
    val normalizedLocale = localeTag.ifBlank { Locale.getDefault().toLanguageTag() }
    val recognizer = SpeechRecognizer.createSpeechRecognizer(reactContext)
    speechRecognizer = recognizer

    recognizer.setRecognitionListener(
      object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) = Unit
        override fun onBeginningOfSpeech() = Unit
        override fun onRmsChanged(rmsdB: Float) = Unit
        override fun onBufferReceived(buffer: ByteArray?) = Unit
        override fun onEndOfSpeech() = Unit
        override fun onPartialResults(partialResults: Bundle?) = Unit
        override fun onEvent(eventType: Int, params: Bundle?) = Unit

        override fun onError(error: Int) {
          val promise = pendingPromise ?: return
          pendingPromise = null
          cleanupRecognizer()

          when (error) {
            SpeechRecognizer.ERROR_CLIENT,
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> promise.reject(
              "unavailable",
              "Voice input is unavailable."
            )
            SpeechRecognizer.ERROR_NO_MATCH,
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> promise.reject(
              "no_transcript",
              "Voice input did not return a transcript."
            )
            else -> promise.reject("unavailable", "Voice input is unavailable.")
          }
        }

        override fun onResults(results: Bundle?) {
          val promise = pendingPromise ?: return
          pendingPromise = null
          cleanupRecognizer()

          val transcript =
            results
              ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
              ?.firstOrNull()
              ?.trim()
              .orEmpty()

          if (transcript.isBlank()) {
            promise.reject("no_transcript", "Voice input did not return a transcript.")
          } else {
            promise.resolve(transcript)
          }
        }
      }
    )

    val intent =
      Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, normalizedLocale)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, normalizedLocale)
        putExtra(RecognizerIntent.EXTRA_PROMPT, prompt)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
      }

    try {
      recognizer.startListening(intent)
    } catch (error: RuntimeException) {
      val promise = pendingPromise ?: return
      pendingPromise = null
      cleanupRecognizer()
      promise.reject("unavailable", "Voice input is unavailable.", error)
    }
  }

  private fun cleanupRecognizer() {
    speechRecognizer?.setRecognitionListener(null)
    speechRecognizer?.destroy()
    speechRecognizer = null
  }
}
