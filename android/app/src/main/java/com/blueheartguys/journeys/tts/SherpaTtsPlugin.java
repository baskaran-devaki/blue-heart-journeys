package com.blueheartguys.journeys.tts;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.k2fsa.sherpa.onnx.OfflineTts;
import com.k2fsa.sherpa.onnx.OfflineTtsConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig;
import com.k2fsa.sherpa.onnx.GenerationConfig;

@CapacitorPlugin(name = "SherpaTts")
public class SherpaTtsPlugin extends Plugin {

    private OfflineTts tts;
    private AudioTrack audioTrack;
    private volatile boolean stopped = false;

    private static final String MODEL_DIR =
            "tts/ta_IN-rasa_female-medium";

    private static final String MODEL =
            MODEL_DIR + "/ta_IN-rasa_female-medium.onnx";

    private static final String TOKENS =
            MODEL_DIR + "/tokens.txt";

    private static final String DATA_DIR =
            MODEL_DIR + "/espeak-ng-data";

    private synchronized void initializeTts() {
        if (tts != null) {
            return;
        }

        OfflineTtsVitsModelConfig vits =
                new OfflineTtsVitsModelConfig();

        vits.setModel(MODEL);
        vits.setTokens(TOKENS);
        vits.setDataDir(DATA_DIR);

        OfflineTtsModelConfig model = new OfflineTtsModelConfig();
        model.setVits(vits);

        OfflineTtsConfig config = new OfflineTtsConfig(model, "", "", 1, 0.2f);

        tts = new OfflineTts(
                getContext().getAssets(),
                config
        );

        initializeAudioTrack();
    }

    private synchronized void initializeAudioTrack() {
        if (tts == null || audioTrack != null) {
            return;
        }

        int sampleRate = tts.sampleRate();

        int bufferSize = AudioTrack.getMinBufferSize(
                sampleRate,
                AudioFormat.CHANNEL_OUT_MONO,
                AudioFormat.ENCODING_PCM_FLOAT
        );

        AudioAttributes attributes =
                new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build();

        AudioFormat format =
                new AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .setSampleRate(sampleRate)
                        .build();

        audioTrack = new AudioTrack(
                attributes,
                format,
                bufferSize,
                AudioTrack.MODE_STREAM,
                AudioManager.AUDIO_SESSION_ID_GENERATE
        );
    }

    @PluginMethod
    public void speak(PluginCall call) {

        String text = call.getString("text", "");

        if (text == null || text.trim().isEmpty()) {
            call.reject("Text is empty");
            return;
        }

        double speedValue = call.getDouble("speed", 1.0);

        final float speed =
                (float) Math.max(0.5, Math.min(2.0, speedValue));

        new Thread(() -> {

            try {
                initializeTts();

                stopped = false;

                if (audioTrack.getPlayState()
                        == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack.pause();
                }

                audioTrack.flush();
                audioTrack.play();

                GenerationConfig generationConfig =
                        new GenerationConfig();

                generationConfig.setSpeed(speed);
                generationConfig.setSid(0);

                com.k2fsa.sherpa.onnx.GeneratedAudio audio =
                        tts.generateWithConfig(
                                text,
                                generationConfig
                        );

                float[] samples = audio.getSamples();

                if (!stopped && samples != null && samples.length > 0) {

                    audioTrack.write(
                            samples,
                            0,
                            samples.length,
                            AudioTrack.WRITE_BLOCKING
                    );
                }

                if (audioTrack.getPlayState()
                        == AudioTrack.PLAYSTATE_PLAYING) {
                    audioTrack.pause();
                    audioTrack.flush();
                }

                getBridge().executeOnMainThread(() -> {
                    JSObject result = new JSObject();
                    result.put("success", !stopped);
                    call.resolve(result);
                });

            } catch (Exception e) {

                getBridge().executeOnMainThread(() ->
                        call.reject(
                                "Sherpa TTS failed: "
                                        + e.getMessage(),
                                e
                        )
                );
            }

        }, "SherpaTtsThread").start();
    }

    @PluginMethod
    public void stop(PluginCall call) {

        stopped = true;

        try {
            if (audioTrack != null) {
                audioTrack.pause();
                audioTrack.flush();
            }
        } catch (Exception ignored) {
        }

        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {

        stopped = true;

        if (audioTrack != null) {
            try {
                audioTrack.stop();
            } catch (Exception ignored) {
            }

            audioTrack.release();
            audioTrack = null;
        }

        tts = null;
    }
}
