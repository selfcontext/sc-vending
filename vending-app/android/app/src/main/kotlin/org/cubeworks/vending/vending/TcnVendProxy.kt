package org.cubeworks.vending.vending

import android.content.Context
import androidx.annotation.NonNull
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import com.tcn.sdk.spring.TcnVendIF
import com.tcn.sdk.spring.TcnShareUseData

class TcnVendProxy : FlutterPlugin, MethodChannel.MethodCallHandler {
    private lateinit var channel: MethodChannel
    private var applicationContext: Context? = null

    override fun onAttachedToEngine(@NonNull binding: FlutterPlugin.FlutterPluginBinding) {
        applicationContext = binding.applicationContext
        channel = MethodChannel(binding.binaryMessenger, "com.cubeworks.vending/sdk")
        channel.setMethodCallHandler(this)
    }

    override fun onDetachedFromEngine(@NonNull binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
        applicationContext = null
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "initializeSdk" -> {
                // If SDK needs serial port:
                // TcnShareUseData.getInstance().setBoardSerPortFirst("/dev/ttyS1")
                result.success(true)
            }

            "setDropSensorCheck" -> {
                val enable: Boolean? = call.argument("enable")
                if (enable != null) {
                    TcnShareUseData.getInstance().setDropSensorCheck(enable)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "enable argument is null", null)
                }
            }

            "isDropSensorCheck" -> {
                val state = TcnShareUseData.getInstance().isDropSensorCheck()
                result.success(state)
            }

            "querySlotStatus" -> {
                val slotNo: Int? = call.argument("slotNo")
                if (slotNo != null) {
                    TcnVendIF.getInstance().reqQuerySlotStatus(slotNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "slotNo argument is null", null)
                }
            }

            "ship" -> {
                val slotNo: Int? = call.argument("slotNo")
                val shipMethod: Int? = call.argument("shipMethod")
                val amount: Int? = call.argument("amount")
                val tradeNo: String? = call.argument("tradeNo")
                if (slotNo != null && shipMethod != null && amount != null && tradeNo != null) {
                    TcnVendIF.getInstance().reqShip(slotNo, shipMethod, amount, tradeNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "one or more arguments are null", null)
                }
            }

            "shipTest" -> {
                val slotNo: Int? = call.argument("slotNo")
                if (slotNo != null) {
                    TcnVendIF.getInstance().reqShipTest(slotNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "slotNo argument is null", null)
                }
            }

            "selectSlot" -> {
                val slotNo: Int? = call.argument("slotNo")
                if (slotNo != null) {
                    TcnVendIF.getInstance().reqSelectSlotNo(slotNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "slotNo argument is null", null)
                }
            }

            "reset" -> {
                val groupSpringId: String? = call.argument("groupSpringId")
                if (groupSpringId != null) {
                    TcnVendIF.getInstance().reqReset(groupSpringId)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "groupSpringId argument is null", null)
                }
            }

            "setHeatSpring" -> {
                val temp: Int? = call.argument("temp")
                val startTime: Int? = call.argument("startTime")
                val endTime: Int? = call.argument("endTime")
                if (temp != null && startTime != null && endTime != null) {
                    TcnVendIF.getInstance().reqHeatSpring(-1, temp, startTime, endTime)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "temp/startTime/endTime argument is null", null)
                }
            }

            "setGlassHeat" -> {
                val enable: Boolean? = call.argument("enable")
                if (enable != null) {
                    TcnVendIF.getInstance().reqSetGlassHeatEnable(-1, enable)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "enable argument is null", null)
                }
            }

            "setLedOpen" -> {
                val enable: Boolean? = call.argument("enable")
                if (enable != null) {
                    TcnVendIF.getInstance().reqSetLedOpen(-1, enable)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "enable argument is null", null)
                }
            }

            "setBuzzerOpen" -> {
                val enable: Boolean? = call.argument("enable")
                if (enable != null) {
                    TcnVendIF.getInstance().reqSetBuzzerOpen(-1, enable)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "enable argument is null", null)
                }
            }

            "setSpringSlot" -> {
                val slotNo: Int? = call.argument("slotNo")
                if (slotNo != null) {
                    TcnVendIF.getInstance().reqSetSpringSlot(slotNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "slotNo argument is null", null)
                }
            }

            "setBeltsSlot" -> {
                val slotNo: Int? = call.argument("slotNo")
                if (slotNo != null) {
                    TcnVendIF.getInstance().reqSetBeltsSlot(slotNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "slotNo argument is null", null)
                }
            }

            "setSpringAllSlot" -> {
                TcnVendIF.getInstance().reqSpringAllSlot(-1)
                result.success(null)
            }

            "setBeltsAllSlot" -> {
                TcnVendIF.getInstance().reqBeltsAllSlot(-1)
                result.success(null)
            }

            "setSingleSlot" -> {
                val slotNo: Int? = call.argument("slotNo")
                if (slotNo != null) {
                    TcnVendIF.getInstance().reqSingleSlot(slotNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "slotNo argument is null", null)
                }
            }

            "setDoubleSlot" -> {
                val slotNo: Int? = call.argument("slotNo")
                if (slotNo != null) {
                    TcnVendIF.getInstance().reqDoubleSlot(slotNo)
                    result.success(null)
                } else {
                    result.error("ARG_NULL", "slotNo argument is null", null)
                }
            }

            "setSingleAllSlot" -> {
                TcnVendIF.getInstance().reqSingleAllSlot(-1)
                result.success(null)
            }

            "testMode" -> {
                TcnVendIF.getInstance().reqTestMode(-1)
                result.success(null)
            }

            else -> result.notImplemented()
        }
    }
}