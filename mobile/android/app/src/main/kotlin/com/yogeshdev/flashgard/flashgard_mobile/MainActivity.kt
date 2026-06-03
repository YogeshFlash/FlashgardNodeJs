package com.yogeshdev.flashgard.flashgard_mobile

import android.os.Bundle
import android.graphics.Point
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.EventChannel
import com.inuker.bluetooth.library.cc.BluetoothSDK
import com.inuker.bluetooth.library.cc.listener.IBluetoothSearchListener
import com.inuker.bluetooth.library.cc.listener.IBluetoothConnectListener
import com.inuker.bluetooth.library.search.SearchResult
import com.inuker.bluetooth.library.cc.IBleCutProgressCallBack
import com.inuker.bluetooth.library.cc.IBleValueResultCallBack
import com.inuker.bluetooth.library.cc.IBleDefaultResultCallBack
import java.io.IOException
import java.io.OutputStream
import java.util.UUID

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.flashgard.plotter/api"
    private val EVENT_CHANNEL = "com.flashgard.plotter/progress"
    private var progressSink: EventChannel.EventSink? = null

    // SPP (Serial Port Profile) UUID - standard for Bluetooth serial communication
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    // Track connection type: "sdk" or "classic" or null
    private var connectionType: String? = null
    private var classicSocket: BluetoothSocket? = null
    private var classicOutputStream: OutputStream? = null

    // Classic Bluetooth discovery
    private var discoveryDevices = mutableListOf<Map<String, Any?>>()
    private var discoveryReceiver: BroadcastReceiver? = null

    // Auto-pairing handler for Portrait2
    private val pairingReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == BluetoothDevice.ACTION_PAIRING_REQUEST) {
                val device: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                if (device?.name?.contains("Portrait2", ignoreCase = true) == true) {
                    val variant = intent.getIntExtra(BluetoothDevice.EXTRA_PAIRING_VARIANT, BluetoothDevice.ERROR)
                    try {
                        // 2 = PASSKEY_CONFIRMATION, 3 = CONSENT
                        if (variant == 2 || variant == 3) {
                            device.setPairingConfirmation(true)
                            abortBroadcast()
                        } else if (variant == 0) { // 0 = PIN
                            device.setPin("0000".toByteArray())
                            abortBroadcast()
                        }
                    } catch (_: Exception) {}
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        BluetoothSDK.init(applicationContext, "hsznqmji")
        registerReceiver(pairingReceiver, IntentFilter(BluetoothDevice.ACTION_PAIRING_REQUEST).apply { priority = 100 })
    }

    override fun onDestroy() {
        super.onDestroy()
        disconnectClassic()
        try { unregisterReceiver(discoveryReceiver) } catch (_: Exception) {}
        try { unregisterReceiver(pairingReceiver) } catch (_: Exception) {}
    }

    private fun disconnectClassic() {
        try {
            classicOutputStream?.close()
            classicSocket?.close()
        } catch (_: Exception) {}
        classicOutputStream = null
        classicSocket = null
        if (connectionType == "classic") connectionType = null
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, EVENT_CHANNEL).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, sink: EventChannel.EventSink?) {
                    progressSink = sink
                }
                override fun onCancel(arguments: Any?) {
                    progressSink = null
                }
            }
        )

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            val sdk = BluetoothSDK.getInstance()
            
            when (call.method) {
                "search" -> {
                    val timeout = call.argument<Int>("timeout") ?: 5000
                    val allDevices = mutableListOf<Map<String, Any?>>()
                    val sdkDevices = mutableListOf<Map<String, Any?>>()
                    val classicDeviceAddresses = mutableSetOf<String>()
                    var sdkDone = false
                    var classicDone = false
                    var isResultReturned = false

                    fun mergeAndReturn() {
                        if (!sdkDone || !classicDone || isResultReturned) return
                        isResultReturned = true
                        
                        // Merge logic
                        val merged = mutableListOf<Map<String, Any?>>()
                        val seenAddresses = mutableSetOf<String>()
                        var portrait2Seen = false

                        for (dev in sdkDevices) {
                            val addr = dev["address"] as? String ?: continue
                            val name = dev["name"] as? String ?: ""
                            
                            // Hide Portrait2 from SDK results (confirmed wrong interface)
                            if (name.contains("Portrait2", ignoreCase = true)) continue
                            
                            seenAddresses.add(addr)
                            merged.add(dev + mapOf("type" to "sdk"))
                        }
                        
                        for (dev in allDevices) {
                            val addr = dev["address"] as? String ?: continue
                            val name = dev["name"] as? String ?: ""
                            
                            if (addr !in seenAddresses) {
                                // De-duplicate Portrait2: Only show the one starting with 00:1A:7D
                                if (name.contains("Portrait2", ignoreCase = true)) {
                                    if (!addr.startsWith("00:1A:7D", ignoreCase = true)) continue
                                    if (portrait2Seen) continue
                                    portrait2Seen = true
                                }
                                
                                seenAddresses.add(addr)
                                merged.add(dev + mapOf("type" to "classic"))
                            }
                        }

                        result.success(merged)
                    }

                    // 1. Start SDK BLE search
                    sdk.search(timeout, object : IBluetoothSearchListener {
                        override fun onDeviceFounded(device: SearchResult?) {
                            device?.let {
                                val name = it.getName() ?: "Unknown"
                                sdkDevices.add(mapOf(
                                    "name" to name,
                                    "address" to it.getAddress(),
                                    "rssi" to it.b
                                ))
                            }
                        }
                        override fun onComplete() { sdkDone = true; mergeAndReturn() }
                        override fun onError(msg: String?) { sdkDone = true; mergeAndReturn() }
                        override fun onError(code: Int) { sdkDone = true; mergeAndReturn() }
                    })

                    // 2. Also get Classic Bluetooth paired + discovered devices
                    try {
                        val adapter = BluetoothAdapter.getDefaultAdapter()
                        
                        // Add bonded (paired) devices that match 'Portrait2'
                        adapter?.bondedDevices?.forEach { device ->
                            val name = device.name ?: "Unknown"
                            if (name.contains("Portrait2", ignoreCase = true)) {
                                val addr = device.address
                                if (addr !in classicDeviceAddresses) {
                                    classicDeviceAddresses.add(addr)
                                    allDevices.add(mapOf(
                                        "name" to name,
                                        "address" to addr,
                                        "rssi" to 0
                                    ))
                                }
                            }
                        }

                        // Start Classic discovery for unpaired devices
                        discoveryReceiver?.let {
                            try { unregisterReceiver(it) } catch (_: Exception) {}
                        }
                        discoveryReceiver = object : BroadcastReceiver() {
                            override fun onReceive(context: Context?, intent: Intent?) {
                                when (intent?.action) {
                                    BluetoothDevice.ACTION_FOUND -> {
                                        val device: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                                        device?.let { d ->
                                            val name = d.name ?: "Unknown"
                                            if (name.contains("Portrait2", ignoreCase = true)) {
                                                val addr = d.address
                                                if (addr !in classicDeviceAddresses) {
                                                    classicDeviceAddresses.add(addr)
                                                    allDevices.add(mapOf(
                                                        "name" to name,
                                                        "address" to addr,
                                                        "rssi" to (intent.getShortExtra(BluetoothDevice.EXTRA_RSSI, 0.toShort()).toInt())
                                                    ))
                                                }
                                            }
                                        }
                                    }
                                    BluetoothAdapter.ACTION_DISCOVERY_FINISHED -> {
                                        classicDone = true
                                        mergeAndReturn()
                                    }
                                }
                            }
                        }
                        val filter = IntentFilter().apply {
                            addAction(BluetoothDevice.ACTION_FOUND)
                            addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED)
                        }
                        registerReceiver(discoveryReceiver, filter)
                        adapter?.startDiscovery()

                        // Timeout fallback for Classic discovery
                        android.os.Handler(mainLooper).postDelayed({
                            if (!classicDone) {
                                adapter?.cancelDiscovery()
                                classicDone = true
                                mergeAndReturn()
                            }
                        }, timeout.toLong() + 2000) // Give Classic a bit more time
                    } catch (e: SecurityException) {
                        // Missing permissions - just proceed with SDK results
                        classicDone = true
                        mergeAndReturn()
                    }
                }
                "stopSearch" -> {
                    sdk.stopSearch()
                    try {
                        BluetoothAdapter.getDefaultAdapter()?.cancelDiscovery()
                    } catch (_: SecurityException) {}
                    result.success(true)
                }
                "connect" -> {
                    val address = call.argument<String>("address") ?: return@setMethodCallHandler result.error("INVALID_ARGUMENT", "Address required", null)
                    
                    try {
                        val adapter = BluetoothAdapter.getDefaultAdapter()
                        adapter?.cancelDiscovery()
                        val device = adapter.getRemoteDevice(address)
                        val name = device.name ?: "Unknown"
                        val isPortrait = name.contains("Portrait2", ignoreCase = true)

                        val connectClassic = {
                            Thread {
                                try {
                                    // Give adapter time to settle after discovery cancel
                                    Thread.sleep(500)
                                    val socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                                    socket.connect()
                                    
                                    classicSocket = socket
                                    classicOutputStream = socket.outputStream
                                    connectionType = "classic"
                                    runOnUiThread {
                                        result.success(mapOf("success" to true, "type" to "classic"))
                                    }
                                } catch (e: Exception) {
                                    runOnUiThread {
                                        result.error("CONNECT_FAIL", "Connection failed: ${e.message}", null)
                                    }
                                }
                            }.start()
                        }

                        if (isPortrait) {
                            connectClassic()
                        } else {
                            sdk.connect(SearchResult(device), object : IBluetoothConnectListener {
                                override fun onConnected(p0: String?, p1: String?) {
                                    connectionType = "sdk"
                                    result.success(mapOf("success" to true, "type" to "sdk"))
                                }
                                override fun onError(code: Int, msg: String?) {
                                    connectClassic()
                                }
                            })
                        }
                    } catch (e: Exception) {
                        result.error("CONNECT_FAIL", e.message, null)
                    }
                }
                "disconnect" -> {
                    if (connectionType == "classic") {
                        disconnectClassic()
                    } else {
                        sdk.disConnected()
                        connectionType = null
                    }
                    result.success(true)
                }
                "isConnected" -> {
                    val connected = when (connectionType) {
                        "sdk" -> sdk.isConnected()
                        "classic" -> classicSocket?.isConnected == true
                        else -> false
                    }
                    result.success(connected)
                }
                "getConnectionType" -> {
                    result.success(connectionType)
                }

                "getPageSize" -> {
                    if (connectionType == "classic") {
                        // Classic plotters don't support queries — return defaults
                        result.success(mapOf("width" to 180.0, "height" to 297.0))
                    } else {
                        if (!sdk.isConnected()) return@setMethodCallHandler result.error("NOT_CONNECTED", "Not connected", null)
                        sdk.queryMachineWide(object : IBleValueResultCallBack<Int> {
                            override fun onSuccessful(width: Int?) {
                                runOnUiThread {
                                    result.success(mapOf(
                                        "width" to (width?.toDouble() ?: 0.0),
                                        "height" to 0.0
                                    ))
                                }
                            }
                            override fun onError(code: Int, msg: String?) {
                                runOnUiThread { result.error("QUERY_ERROR", msg ?: "Error code: $code", code) }
                            }
                        })
                    }
                }

                "getMachineParameters" -> {
                    if (connectionType == "classic") {
                        // Classic plotters don't support parameter queries
                        result.success(mapOf("speed" to 0, "pressure" to 0, "width" to 0, "height" to 0))
                    } else {
                        if (!sdk.isConnected()) return@setMethodCallHandler result.error("NOT_CONNECTED", "Not connected", null)
                        
                        val params = mutableMapOf<String, Int>()
                        sdk.queryMachineSpeed(object : IBleValueResultCallBack<Int> {
                            override fun onSuccessful(speed: Int?) {
                                params["speed"] = speed ?: 0
                                sdk.queryMachinePressure(object : IBleValueResultCallBack<Int> {
                                    override fun onSuccessful(pressure: Int?) {
                                        params["pressure"] = pressure ?: 0
                                        sdk.queryMachineGear(object : IBleValueResultCallBack<Point> {
                                            override fun onSuccessful(point: Point?) {
                                                params["width"] = point?.x ?: 0
                                                params["height"] = point?.y ?: 0
                                                runOnUiThread { result.success(params) }
                                            }
                                            override fun onError(code: Int, msg: String?) { runOnUiThread { result.success(params) } }
                                        })
                                    }
                                    override fun onError(code: Int, msg: String?) { runOnUiThread { result.success(params) } }
                                })
                            }
                            override fun onError(code: Int, msg: String?) { runOnUiThread { result.error("QUERY_ERROR", msg ?: "Error code: $code", code) } }
                        })
                    }
                }
                "setMachineSpeed" -> {
                    val speed = call.argument<Int>("speed") ?: 300
                    sdk.setMachineSpeed(speed, object : IBleDefaultResultCallBack {
                        override fun onSuccessful() { result.success(true) }
                        override fun onError(code: Int, msg: String?) { result.error("SDK_ERROR", msg ?: "Error code: $code", code) }
                    })
                }
                "setMachineWide" -> {
                    val wide = call.argument<Int>("wide") ?: 208
                    sdk.setMachineWide(wide, object : IBleDefaultResultCallBack {
                        override fun onSuccessful() { result.success(true) }
                        override fun onError(code: Int, msg: String?) { result.error("SDK_ERROR", msg ?: "Error code: $code", code) }
                    })
                }
                "cutFile" -> {
                    val content = call.argument<String>("content") ?: ""
                    val name = call.argument<String>("name") ?: "cut"
                    val speed = call.argument<Int>("speed") ?: 300
                    val width = call.argument<Double>("width") ?: 180.0
                    val height = call.argument<Double>("height") ?: 297.0
                    
                    if (connectionType == "classic") {
                        // === CLASSIC SPP: Send raw PLT data with Portrait2 compatibility ===
                        Thread {
                            try {
                                val outputStream = classicOutputStream ?: throw Exception("Output stream not available")
                                
                                // 1. CALCULATE BOUNDING BOX (to find design center)
                                val initialRegex = Regex("([A-Za-z]+)(-?\\d+),(-?\\d+)")
                                var minX = Float.MAX_VALUE; var maxX = Float.MIN_VALUE
                                var minY = Float.MAX_VALUE; var maxY = Float.MIN_VALUE
                                
                                initialRegex.findAll(content).forEach { match ->
                                    val x = match.groupValues[2].toFloat()
                                    val y = match.groupValues[3].toFloat()
                                    if (x < minX) minX = x; if (x > maxX) maxX = x
                                    if (y < minY) minY = y; if (y > maxY) maxY = y
                                }

                                // 2. CALCULATE CENTERING OFFSETS
                                // Assume input is 1016 DPI, target machine area is in mm
                                val designCenterX = (minX + maxX) / 2
                                val designCenterY = (minY + maxY) / 2
                                
                                // Target center in 1016 DPI units (to keep scaling math simple)
                                val targetCenterX = (width * 40 / 2).toFloat() 
                                val targetCenterY = (height * 40 / 2).toFloat()
                                
                                val offsetX = targetCenterX - designCenterX
                                val offsetY = targetCenterY - designCenterY

                                // 3. APPLY SCALING (0.5x) AND CENTERING OFFSET
                                val coordRegex = Regex("([A-Za-z]+)(-?\\d+)(?:,(-?\\d+))?")
                                val scaledContent = content.replace(coordRegex) { match ->
                                    val cmd = match.groupValues[1]
                                    val xStr = match.groupValues[2]
                                    val yStr = match.groupValues[3]
                                    
                                    if (yStr.isNotEmpty()) {
                                        // Center + Scale: (Coordinate + Offset) * 0.5
                                        val x = ((xStr.toInt() + offsetX) * 0.5f).toInt()
                                        val y = ((yStr.toInt() + offsetY) * 0.5f).toInt()
                                        "$cmd$x,$y"
                                    } else {
                                        match.value
                                    }
                                }

                                // Portrait2 often needs SP1 (Select Pen) and absolute mode forced
                                val finalContent = "IN;PA;SP1;" + scaledContent.trim() + ";\u0003"
                                
                                val data = finalContent.toByteArray(Charsets.UTF_8)
                                val totalBytes = data.size
                                var offset = 0
                                val chunkSize = 512 // Smaller chunks for even better stability

                                while (offset < totalBytes) {
                                    val end = minOf(offset + chunkSize, totalBytes)
                                    outputStream.write(data, offset, end - offset)
                                    outputStream.flush()
                                    
                                    offset = end
                                    val progress = (offset * 100 / totalBytes)
                                    
                                    runOnUiThread {
                                        progressSink?.success(progress)
                                    }
                                    
                                    // Increased Throttling for mechanical stability
                                    Thread.sleep(200)
                                }
                                
                                runOnUiThread {
                                    result.success(true)
                                }
                            } catch (e: Exception) {
                                runOnUiThread {
                                    result.error("CUT_FAIL", e.message, null)
                                }
                            }
                        }.start()
                    } else {
                        // === SDK BLE: Existing flow ===
                        if (!sdk.isConnected()) return@setMethodCallHandler result.error("NOT_CONNECTED", "Not connected", null)
                        
                        sdk.setMachineSpeed(speed, object : IBleDefaultResultCallBack {
                            override fun onSuccessful() {
                                sdk.setMachineWide(width.toInt(), object : IBleDefaultResultCallBack {
                                    override fun onSuccessful() { startNativeCut(sdk, content, name, width, height, result) }
                                    override fun onError(code: Int, msg: String?) { startNativeCut(sdk, content, name, width, height, result) }
                                })
                            }
                            override fun onError(code: Int, msg: String?) { startNativeCut(sdk, content, name, width, height, result) }
                        })
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun startNativeCut(sdk: BluetoothSDK, content: String, name: String, width: Double, height: Double, result: MethodChannel.Result) {
        val callback = object : IBleCutProgressCallBack {
            override fun onProgress(progress: Int) {
                runOnUiThread { progressSink?.success(progress) }
            }
            override fun onSuccess() {
                runOnUiThread {
                    progressSink?.success(100)
                    result.success(true)
                }
                sdk.unRegisterCutProgressListener(this)
            }
            override fun onError(code: Int, msg: String?) {
                runOnUiThread {
                    progressSink?.error("CUT_ERROR", msg ?: "Error code: $code", code)
                    result.error("CUT_ERROR", msg ?: "Error code: $code", code)
                }
                sdk.unRegisterCutProgressListener(this)
            }
        }
        sdk.registerCutProgressListener(callback)
        sdk.cutFile(content, name, false)
    }
}
