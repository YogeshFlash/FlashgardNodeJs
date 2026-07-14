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
import io.flutter.embedding.android.FlutterFragmentActivity
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

class MainActivity : FlutterFragmentActivity() {
    private val CHANNEL = "com.flashgard.plotter/api"
    private val EVENT_CHANNEL = "com.flashgard.plotter/progress"
    private var progressSink: EventChannel.EventSink? = null

    // SPP (Serial Port Profile) UUID - standard for Bluetooth serial communication
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    // Track connection type: "sdk" or "classic" or null
    private var connectionType: String? = null
    private var classicSocket: BluetoothSocket? = null
    private var classicOutputStream: OutputStream? = null
    private var lastConnectedAddress: String? = null

    // Classic Bluetooth discovery
    private var discoveryDevices = mutableListOf<Map<String, Any?>>()
    private var discoveryReceiver: BroadcastReceiver? = null

    // Auto-pairing handler for classic plotters
    private val pairingReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == BluetoothDevice.ACTION_PAIRING_REQUEST) {
                val device: BluetoothDevice? = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                val name = device?.name ?: ""
                val isMatch = name.contains("portrait", ignoreCase = true) || name.contains("cameo", ignoreCase = true) || name.contains("filmcut", ignoreCase = true) || name.contains("film cut", ignoreCase = true) || name.contains("film-cut", ignoreCase = true)
                if (isMatch) {
                    val variant = intent.getIntExtra(BluetoothDevice.EXTRA_PAIRING_VARIANT, BluetoothDevice.ERROR)
                    try {
                        // 2 = PASSKEY_CONFIRMATION, 3 = CONSENT
                        if (variant == 2 || variant == 3) {
                            device?.setPairingConfirmation(true)
                            abortBroadcast()
                        } else if (variant == 0) { // 0 = PIN
                            device?.setPin("0000".toByteArray())
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

                    // 2. Start Classic Bluetooth discovery for active devices in range
                    try {
                        val adapter = BluetoothAdapter.getDefaultAdapter()

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
                                            val isMatch = name.contains("portrait", ignoreCase = true) || name.contains("cameo", ignoreCase = true) || name.contains("filmcut", ignoreCase = true) || name.contains("film cut", ignoreCase = true) || name.contains("film-cut", ignoreCase = true)
                                            if (isMatch) {
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
                        val isClassicOnly = name.contains("Portrait2", ignoreCase = true)
 
                        val connectClassic = {
                            Thread {
                                try {
                                    // Give adapter time to settle after discovery cancel
                                    Thread.sleep(500)
                                    var socket: BluetoothSocket? = null
                                    var connected = false
                                    var lastError: String? = null
                                    
                                    // 1. Try insecure SPP socket first (highly compatible, avoids pin code popups)
                                    try {
                                        socket = device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
                                        socket.connect()
                                        connected = true
                                    } catch (e: Exception) {
                                        lastError = e.message
                                        try { socket?.close() } catch (_: Exception) {}
                                    }
                                    
                                    // Detect if device is completely out of range, turned off, or unreachable
                                    val isDeviceUnreachable = lastError != null && (
                                        lastError.contains("timeout", ignoreCase = true) || 
                                        lastError.contains("host is down", ignoreCase = true) || 
                                        lastError.contains("connection refused", ignoreCase = true) ||
                                        lastError.contains("connection reset", ignoreCase = true)
                                    )
                                    
                                    // 2. Try secure SPP socket
                                    if (!connected && !isDeviceUnreachable) {
                                        try {
                                            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                                            socket.connect()
                                            connected = true
                                        } catch (e: Exception) {
                                            lastError = e.message
                                            try { socket?.close() } catch (_: Exception) {}
                                        }
                                    }
                                    
                                    // 3. Fallback reflection on channel 1 (secure)
                                    if (!connected && !isDeviceUnreachable) {
                                        try {
                                            val m = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                                            socket = m.invoke(device, 1) as BluetoothSocket
                                            socket.connect()
                                            connected = true
                                        } catch (e: Exception) {
                                            lastError = e.message
                                            try { socket?.close() } catch (_: Exception) {}
                                        }
                                    }
                                    
                                    // 4. Fallback reflection on channel 1 (insecure)
                                    if (!connected && !isDeviceUnreachable) {
                                        try {
                                            val m = device.javaClass.getMethod("createInsecureRfcommSocket", Int::class.javaPrimitiveType)
                                            socket = m.invoke(device, 1) as BluetoothSocket
                                            socket.connect()
                                            connected = true
                                        } catch (e: Exception) {
                                            try { socket?.close() } catch (_: Exception) {}
                                            throw e // rethrow last exception if everything failed
                                        }
                                    }
                                    
                                    classicSocket = socket
                                    classicOutputStream = socket?.outputStream
                                    connectionType = "classic"
                                    lastConnectedAddress = address
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
 
                        if (isClassicOnly) {
                            connectClassic()
                        } else {
                            sdk.connect(SearchResult(device), object : IBluetoothConnectListener {
                                override fun onConnected(p0: String?, p1: String?) {
                                    connectionType = "sdk"
                                    lastConnectedAddress = address
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
                "reset" -> {
                    if (connectionType == "classic") {
                        Thread {
                            try {
                                val socket = classicSocket
                                val outputStream = classicOutputStream
                                if (socket != null && socket.isConnected && outputStream != null) {
                                    try {
                                        outputStream.write("IN;\u0003".toByteArray(Charsets.UTF_8))
                                        outputStream.flush()
                                        runOnUiThread { result.success(true) }
                                        return@Thread
                                    } catch (writeEx: Exception) {
                                        // If write fails, socket is likely broken, proceed to reconnect fallback
                                    }
                                }

                                val address = lastConnectedAddress
                                if (address != null) {
                                    disconnectClassic()
                                    Thread.sleep(500)
                                    val adapter = BluetoothAdapter.getDefaultAdapter()
                                    val device = adapter.getRemoteDevice(address)
                                    var newSocket: BluetoothSocket? = null
                                    try {
                                        newSocket = device.createRfcommSocketToServiceRecord(SPP_UUID)
                                        newSocket.connect()
                                    } catch (e: Exception) {
                                        try { newSocket?.close() } catch (_: Exception) {}
                                        val m = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                                        newSocket = m.invoke(device, 1) as BluetoothSocket
                                        newSocket.connect()
                                    }

                                    classicSocket = newSocket
                                    classicOutputStream = newSocket?.outputStream
                                    connectionType = "classic"
                                    runOnUiThread { result.success(true) }
                                } else {
                                    runOnUiThread { result.error("NOT_CONNECTED", "No device address to reconnect to", null) }
                                }
                            } catch (e: Exception) {
                                runOnUiThread { result.error("RESET_FAIL", e.message, null) }
                            }
                        }.start()
                    } else {
                        result.success(true)
                    }
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
                    
                    val startString = call.argument<String>("startString") ?: "IN;PA;"
                    val endString = call.argument<String>("endString") ?: "\u0003"
                    val xySeparator = call.argument<String>("xySeparator") ?: ","
                    val splitCommands = call.argument<Boolean>("splitCommands") ?: false
                    val mirrorX = call.argument<Boolean>("mirrorX") ?: false
                    val mirrorY = call.argument<Boolean>("mirrorY") ?: false
                    
                    if (connectionType == "classic") {
                        // === CLASSIC SPP: Send raw PLT data with Portrait2 compatibility ===
                        Thread {
                            try {
                                // Clean up any leading initialization commands (IN, PA, SP) from the content
                                val initPrefixRegex = Regex("^(?:IN;|PA;|SP\\d+;)+", RegexOption.IGNORE_CASE)
                                val cleanContent = initPrefixRegex.replace(content.trim(), "")
                                
                                // 1. CALCULATE BOUNDING BOX (to find design center)
                                val initialRegex = Regex("([A-Za-z]+)(-?\\d+),(-?\\d+)")
                                var minX = Float.MAX_VALUE; var maxX = Float.MIN_VALUE
                                var minY = Float.MAX_VALUE; var maxY = Float.MIN_VALUE
                                
                                initialRegex.findAll(cleanContent).forEach { match ->
                                    val x = match.groupValues[2].toFloat()
                                    val y = match.groupValues[3].toFloat()
                                    if (x < minX) minX = x; if (x > maxX) maxX = x
                                    if (y < minY) minY = y; if (y > maxY) maxY = y
                                }
 
                                 // 2. CALCULATE CENTERING OFFSETS
                                 // Assume input is 1016 DPI, target machine area is in mm
                                 val designCenterX = (minX + maxX) / 2
                                 
                                 // Target center in 1016 DPI units (to keep scaling math simple)
                                 val targetCenterX = (width * 40 / 2).toFloat() 
                                 val offsetX = targetCenterX - designCenterX
                                 
                                 // Align Y to start at 10mm margin from the load edge
                                 val marginY = 400.0f
  
                                 // 3. APPLY SCALING, CENTERING OFFSET AND MIRRORING
                                 val coordRegex = Regex("([A-Za-z]+)(-?\\d+)(?:,(-?\\d+))?")
                                 val adapter = BluetoothAdapter.getDefaultAdapter()
                                 val connDevice = lastConnectedAddress?.let { adapter?.getRemoteDevice(it) }
                                 val name = connDevice?.name ?: "Unknown"
                                 val isPortrait = name.contains("Portrait", ignoreCase = true)
                                 
                                 val finalContent = if (isPortrait) {
                                      // GPGL Translation Mode
                                      val gpglBody = cleanContent.replace(coordRegex) { match ->
                                          val cmd = match.groupValues[1]
                                          val xStr = match.groupValues[2]
                                          val yStr = match.groupValues[3]
                                          
                                          if (yStr.isNotEmpty()) {
                                              val rawX = xStr.toFloat()
                                              val rawY = yStr.toFloat()
                                              
                                              // GPGL math: gx = hx * 0.5 + 411.5, gy = hy * 0.5 + 350.0
                                              val x = (rawX * 0.5f + 411.5f).toInt()
                                              val y = (rawY * 0.5f + 350.0f).toInt()
                                              val gpglCmd = when (cmd) {
                                                  "PU" -> "M"
                                                  "PD" -> "D"
                                                  else -> cmd
                                              }
                                              "${gpglCmd}${x} ${y}"
                                          } else {
                                              match.value
                                          }
                                      }
                                      val start = "IN; \\30,30 FX30,1 !10,1 LT;SP1;"
                                      val end = "M0 0;"
                                      start + gpglBody.trim() + end
                                 } else {
                                     // Standard HPGL Mode
                                     val scaledContent = cleanContent.replace(coordRegex) { match ->
                                         val cmd = match.groupValues[1]
                                         val xStr = match.groupValues[2]
                                         val yStr = match.groupValues[3]
                                         
                                         if (yStr.isNotEmpty()) {
                                             var rawX = xStr.toFloat()
                                             var rawY = yStr.toFloat()
                                             
                                             if (mirrorX) {
                                                 rawX = (minX + maxX) - rawX
                                             }
                                             if (mirrorY) {
                                                 rawY = (minY + maxY) - rawY
                                             }
                                             
                                             // Center X + Scale: (Coordinate + Offset) * 1.0 (1:1 matching SDK BLE)
                                             val x = ((rawX + offsetX) * 1.0f).toInt()
                                             // Align Y to top + Scale: (Coordinate - minY + marginY) * 1.0
                                             val y = ((rawY - minY + marginY) * 1.0f).toInt()
                                             if (splitCommands && (cmd == "PU" || cmd == "PD")) {
                                                 "${cmd};PA${x}${xySeparator}${y}"
                                             } else {
                                                 "${cmd}${x}${xySeparator}${y}"
                                             }
                                         } else {
                                             match.value
                                         }
                                     }
                                     startString + scaledContent.trim() + endString
                                 }
                                 
                                 println("DEBUG CUT: startString='$startString' endString='$endString'")
                                 println("DEBUG CUT: isConnected=${classicSocket?.isConnected == true}")
                                 println("DEBUG CUT: finalContent preview='${finalContent.take(200)}'")
                                 
                                 val data = finalContent.toByteArray(Charsets.UTF_8)
                                 val totalBytes = data.size
                                 println("DEBUG CUT: totalBytes=$totalBytes")

                                 // Helper: establish a fresh Classic SPP socket to the last device
                                 fun reconnectClassic(): OutputStream {
                                     println("DEBUG CUT: Reconnecting to $lastConnectedAddress...")
                                     try { classicOutputStream?.close() } catch (_: Exception) {}
                                     try { classicSocket?.close() } catch (_: Exception) {}
                                     classicOutputStream = null
                                     classicSocket = null

                                     val btAdapter = BluetoothAdapter.getDefaultAdapter()
                                     val btDevice = btAdapter?.getRemoteDevice(lastConnectedAddress ?: throw Exception("No previous device address"))
                                         ?: throw Exception("Bluetooth adapter unavailable")

                                     // Try insecure first, then secure, then reflection
                                     val newSocket: BluetoothSocket = try {
                                         btDevice.createInsecureRfcommSocketToServiceRecord(SPP_UUID).also { it.connect() }
                                     } catch (_: Exception) {
                                         try {
                                             btDevice.createRfcommSocketToServiceRecord(SPP_UUID).also { it.connect() }
                                         } catch (_: Exception) {
                                             val m = btDevice.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                                             (m.invoke(btDevice, 1) as BluetoothSocket).also { it.connect() }
                                         }
                                     }
                                     classicSocket = newSocket
                                     classicOutputStream = newSocket.outputStream
                                     connectionType = "classic"
                                     println("DEBUG CUT: Reconnected successfully")
                                     return newSocket.outputStream
                                 }

                                 // Write in chunks — auto-reconnect once on broken pipe
                                 var activeStream: OutputStream = classicOutputStream ?: throw Exception("Output stream not available")
                                 var offset = 0
                                 var didReconnect = false

                                 while (offset < totalBytes) {
                                     val end = minOf(offset + 512, totalBytes)
                                     try {
                                         activeStream.write(data, offset, end - offset)
                                         activeStream.flush()
                                     } catch (writeErr: IOException) {
                                         if (!didReconnect) {
                                             println("DEBUG CUT: Pipe broken at offset $offset — attempting reconnect")
                                             activeStream = reconnectClassic()
                                             didReconnect = true
                                             // Retry this chunk on the fresh socket
                                             activeStream.write(data, offset, end - offset)
                                             activeStream.flush()
                                         } else {
                                             throw writeErr // Already reconnected, surface the error
                                         }
                                     }
                                     
                                     offset = end
                                     val progress = (offset * 100 / totalBytes)
                                     runOnUiThread { progressSink?.success(progress) }
                                     Thread.sleep(200)
                                 }
                                 
                                 println("DEBUG CUT: Write completed successfully")
                                 runOnUiThread {
                                     result.success(true)
                                 }
                             } catch (e: Exception) {
                                 println("DEBUG CUT ERROR: ${e.message}")
                                 e.printStackTrace()
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
                                    override fun onSuccessful() { startNativeCut(sdk, content, name, width, height, mirrorX, mirrorY, xySeparator, result) }
                                    override fun onError(code: Int, msg: String?) { startNativeCut(sdk, content, name, width, height, mirrorX, mirrorY, xySeparator, result) }
                                })
                            }
                            override fun onError(code: Int, msg: String?) { startNativeCut(sdk, content, name, width, height, mirrorX, mirrorY, xySeparator, result) }
                        })
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun startNativeCut(sdk: BluetoothSDK, content: String, name: String, width: Double, height: Double, mirrorX: Boolean, mirrorY: Boolean, xySeparator: String, result: MethodChannel.Result) {
        var processedContent = content
        if (mirrorX || mirrorY) {
            // Calculate bounding box of raw content
            val initialRegex = Regex("([A-Za-z]+)(-?\\d+),(-?\\d+)")
            var minX = Float.MAX_VALUE; var maxX = Float.MIN_VALUE
            var minY = Float.MAX_VALUE; var maxY = Float.MIN_VALUE
            
            initialRegex.findAll(content).forEach { match ->
                val x = match.groupValues[2].toFloat()
                val y = match.groupValues[3].toFloat()
                if (x < minX) minX = x; if (x > maxX) maxX = x
                if (y < minY) minY = y; if (y > maxY) maxY = y
            }
            
            val coordRegex = Regex("([A-Za-z]+)(-?\\d+)(?:,(-?\\d+))?")
            processedContent = content.replace(coordRegex) { match ->
                val cmd = match.groupValues[1]
                val xStr = match.groupValues[2]
                val yStr = match.groupValues[3]
                
                if (yStr.isNotEmpty()) {
                    var xVal = xStr.toFloat()
                    var yVal = yStr.toFloat()
                    if (mirrorX) xVal = (minX + maxX) - xVal
                    if (mirrorY) yVal = (minY + maxY) - yVal
                    "${cmd}${xVal.toInt()}${xySeparator}${yVal.toInt()}"
                } else {
                    match.value
                }
            }
        }

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
        sdk.cutFile(processedContent, name, false)
    }
}
