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
import android.hardware.usb.UsbManager
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbConstants
import android.app.PendingIntent
import android.provider.Settings
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

    // Track connection type: "sdk" or "classic" or "usb" or null
    private var connectionType: String? = null
    private var classicSocket: BluetoothSocket? = null
    private var classicOutputStream: OutputStream? = null
    private var lastConnectedAddress: String? = null
    private var lastConnectedName: String? = null

    // USB OTG Plotter fields
    private val ACTION_USB_PERMISSION = "com.flashgard.plotter.USB_PERMISSION"
    private var usbManager: UsbManager? = null
    private var usbDevice: UsbDevice? = null
    private var usbConnection: UsbDeviceConnection? = null
    private var usbInterface: UsbInterface? = null
    private var usbOutEndpoint: UsbEndpoint? = null
    private var usbInEndpoint: UsbEndpoint? = null
    private var pendingUsbResult: MethodChannel.Result? = null

    // USB permission receiver (must be RECEIVER_NOT_EXPORTED on Android 13+ because of explicit intent)
    private val usbPermissionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == ACTION_USB_PERMISSION) {
                synchronized(this) {
                    val device: UsbDevice? = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)
                    val res = pendingUsbResult
                    pendingUsbResult = null
                    val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                    val targetDevice = device ?: usbDevice ?: manager.deviceList.values.firstOrNull()
                    if (granted && targetDevice != null) {
                        finishUsbConnect(targetDevice, res)
                    } else {
                        runOnUiThread {
                            res?.error("PERMISSION_DENIED", "USB Permission Denied. Please tap 'Allow' when prompted to grant plotter access.", null)
                        }
                    }
                }
            }
        }
    }

    // USB hardware attach / detach receiver (must be RECEIVER_EXPORTED on Android 13+ as it comes from system)
    private val usbStateReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                UsbManager.ACTION_USB_DEVICE_ATTACHED -> {
                    android.util.Log.i("FlashgardUSB", "ACTION_USB_DEVICE_ATTACHED received!")
                    usbManager = getSystemService(Context.USB_SERVICE) as UsbManager
                    runOnUiThread {
                        progressSink?.success(mapOf("event" to "usb_attached"))
                    }
                }
                UsbManager.ACTION_USB_DEVICE_DETACHED -> {
                    android.util.Log.i("FlashgardUSB", "ACTION_USB_DEVICE_DETACHED received!")
                    val device: UsbDevice? = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
                    } else {
                        @Suppress("DEPRECATION")
                        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
                    }
                    if (device != null && (device.deviceName == usbDevice?.deviceName || connectionType == "usb")) {
                        disconnectUsb()
                    }
                    runOnUiThread {
                        progressSink?.success(mapOf("event" to "usb_detached"))
                    }
                }
            }
        }
    }

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
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            splashScreen.setOnExitAnimationListener { splashScreenView ->
                splashScreenView.remove()
            }
        }
        super.onCreate(savedInstanceState)
        BluetoothSDK.init(applicationContext, "hsznqmji")
        val pairingFilter = IntentFilter(BluetoothDevice.ACTION_PAIRING_REQUEST).apply { priority = 100 }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(pairingReceiver, pairingFilter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(pairingReceiver, pairingFilter)
        }

        // Initialize usbManager
        usbManager = getSystemService(Context.USB_SERVICE) as UsbManager

        // Register USB permission receiver (RECEIVER_NOT_EXPORTED for explicit in-app broadcasts on Android 13+)
        val permFilter = IntentFilter(ACTION_USB_PERMISSION)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(usbPermissionReceiver, permFilter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(usbPermissionReceiver, permFilter)
        }

        // Register USB attach/detach receiver (RECEIVER_EXPORTED for system hardware broadcasts on Android 13+)
        val stateFilter = IntentFilter().apply {
            addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED)
            addAction(UsbManager.ACTION_USB_DEVICE_DETACHED)
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(usbStateReceiver, stateFilter, Context.RECEIVER_EXPORTED)
        } else {
            registerReceiver(usbStateReceiver, stateFilter)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        disconnectClassic()
        disconnectUsb()
        try { unregisterReceiver(discoveryReceiver) } catch (_: Exception) {}
        try { unregisterReceiver(pairingReceiver) } catch (_: Exception) {}
        try { unregisterReceiver(usbPermissionReceiver) } catch (_: Exception) {}
        try { unregisterReceiver(usbStateReceiver) } catch (_: Exception) {}
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

    private fun disconnectUsb() {
        try {
            usbInterface?.let { usbConnection?.releaseInterface(it) }
            usbConnection?.close()
        } catch (_: Exception) {}
        usbDevice = null
        usbConnection = null
        usbInterface = null
        usbOutEndpoint = null
        usbInEndpoint = null
        if (connectionType == "usb") connectionType = null
    }

    private fun getUsbDeviceDisplayName(device: UsbDevice): String {
        return if (device.vendorId == 0x0B4D && device.productId == 0x1132) {
            "Silhouette Portrait 2"
        } else if (device.vendorId == 0x0B4D && device.productId == 0x112F) {
            "Silhouette Cameo 3"
        } else if (device.vendorId == 0x0B4D && device.productId == 0x1137) {
            "Silhouette Cameo 4"
        } else if (device.vendorId == 0x0B4D && device.productId == 0x1138) {
            "Silhouette Portrait 3"
        } else if (device.vendorId == 0x0B4D) {
            val hex = String.format("0x%04X:0x%04X", device.vendorId, device.productId)
            "Silhouette Plotter ($hex)"
        } else {
            val name = try {
                device.productName ?: device.manufacturerName
            } catch (_: Exception) { null }
            name ?: "USB Plotter (${String.format("0x%04X:0x%04X", device.vendorId, device.productId)})"
        }
    }

    private fun finishUsbConnect(device: UsbDevice, result: MethodChannel.Result?) {
        Thread {
            try {
                disconnectClassic()
                disconnectUsb()
                val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                val connection = manager.openDevice(device) ?: run {
                    runOnUiThread { result?.error("CONNECT_FAIL", "Failed to open USB connection to device", null) }
                    return@Thread
                }

                var claimedInterface: UsbInterface? = null
                var outEp: UsbEndpoint? = null
                var inEp: UsbEndpoint? = null

                // 1. First pass: look for bulk OUT and IN endpoints across all interfaces
                for (i in 0 until device.interfaceCount) {
                    val intf = device.getInterface(i)
                    var foundOut: UsbEndpoint? = null
                    var foundIn: UsbEndpoint? = null
                    for (j in 0 until intf.endpointCount) {
                        val ep = intf.getEndpoint(j)
                        if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                            if (ep.direction == UsbConstants.USB_DIR_OUT && foundOut == null) {
                                foundOut = ep
                            } else if (ep.direction == UsbConstants.USB_DIR_IN && foundIn == null) {
                                foundIn = ep
                            }
                        }
                    }
                    if (foundOut != null && connection.claimInterface(intf, true)) {
                        claimedInterface = intf
                        outEp = foundOut
                        inEp = foundIn
                        break
                    }
                }

                // 2. Second pass (fallback like Xamarin C#): check any OUT endpoint on any interface
                if (claimedInterface == null || outEp == null) {
                    for (i in 0 until device.interfaceCount) {
                        val intf = device.getInterface(i)
                        var foundOut: UsbEndpoint? = null
                        var foundIn: UsbEndpoint? = null
                        for (j in 0 until intf.endpointCount) {
                            val ep = intf.getEndpoint(j)
                            if (ep.direction == UsbConstants.USB_DIR_OUT && foundOut == null) {
                                foundOut = ep
                            } else if (ep.direction == UsbConstants.USB_DIR_IN && foundIn == null) {
                                foundIn = ep
                            }
                        }
                        if (foundOut != null && connection.claimInterface(intf, true)) {
                            claimedInterface = intf
                            outEp = foundOut
                            inEp = foundIn
                            break
                        }
                    }
                }

                // 3. Third pass (direct interface 0 fallback matching Xamarin C# GetInterface(0)):
                if ((claimedInterface == null || outEp == null) && device.interfaceCount > 0) {
                    val intf0 = device.getInterface(0)
                    if (connection.claimInterface(intf0, true) && intf0.endpointCount > 0) {
                        claimedInterface = intf0
                        outEp = intf0.getEndpoint(0)
                        if (intf0.endpointCount > 1) {
                            inEp = intf0.getEndpoint(1)
                        }
                    }
                }

                if (claimedInterface == null || outEp == null) {
                    connection.close()
                    runOnUiThread { result?.error("CONNECT_FAIL", "No compatible USB endpoint found on device (tested ${device.interfaceCount} interfaces)", null) }
                    return@Thread
                }

                usbDevice = device
                usbConnection = connection
                usbInterface = claimedInterface
                usbOutEndpoint = outEp
                usbInEndpoint = inEp
                connectionType = "usb"
                lastConnectedAddress = device.deviceName

                try {
                    // Set Control Line State (DTR = 1, RTS = 1) for CDC ACM / Serial
                    connection.controlTransfer(0x21, 0x22, 0x03, claimedInterface.id, null, 0, 1000)
                } catch (_: Exception) {}

                val devName = getUsbDeviceDisplayName(device)
                lastConnectedName = devName

                val serial = try {
                    device.serialNumber
                } catch (_: Exception) { null }

                runOnUiThread {
                    result?.success(mapOf(
                        "success" to true,
                        "type" to "usb",
                        "name" to devName,
                        "address" to device.deviceName,
                        "vendorId" to device.vendorId,
                        "productId" to device.productId,
                        "serialNumber" to serial
                    ))
                }
            } catch (e: Exception) {
                runOnUiThread { result?.error("CONNECT_FAIL", e.message, null) }
            }
        }.start()
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
                    val adapter = BluetoothAdapter.getDefaultAdapter()
                    if (adapter == null || !adapter.isEnabled) {
                        result.error("BLUETOOTH_OFF", "Bluetooth is turned off. Please turn on Bluetooth to scan.", null)
                        return@setMethodCallHandler
                    }
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

                        // Enumerate connected USB OTG devices (always list at top)
                        try {
                            val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                            for ((_, uDev) in manager.deviceList) {
                                val prod = getUsbDeviceDisplayName(uDev)
                                val hasPerm = manager.hasPermission(uDev)
                                val serial = try {
                                    if (hasPerm) uDev.serialNumber else null
                                } catch (_: Exception) { null }
                                merged.add(0, mapOf(
                                    "name" to prod,
                                    "address" to uDev.deviceName,
                                    "rssi" to 100,
                                    "type" to "usb",
                                    "hasPermission" to hasPerm,
                                    "vendorId" to uDev.vendorId,
                                    "productId" to uDev.productId,
                                    "serialNumber" to serial
                                ))
                            }
                        } catch (_: Exception) {}

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
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                            registerReceiver(discoveryReceiver, filter, Context.RECEIVER_EXPORTED)
                        } else {
                            registerReceiver(discoveryReceiver, filter)
                        }
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
                "getUsbDevices" -> {
                    try {
                        val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                        val devList = manager.deviceList
                        android.util.Log.i("FlashgardUSB", "getUsbDevices queried: deviceCount=${devList.size}")
                        val list = mutableListOf<Map<String, Any?>>()
                        for ((_, uDev) in devList) {
                            val prod = getUsbDeviceDisplayName(uDev)
                            val hasPerm = manager.hasPermission(uDev)
                            val serial = try {
                                if (hasPerm) uDev.serialNumber else null
                            } catch (_: Exception) { null }
                            android.util.Log.i("FlashgardUSB", "Found USB Device: name=$prod, VID=${uDev.vendorId}, PID=${uDev.productId}, hasPerm=$hasPerm")
                            list.add(mapOf(
                                "name" to prod,
                                "address" to uDev.deviceName,
                                "rssi" to 100,
                                "type" to "usb",
                                "hasPermission" to hasPerm,
                                "vendorId" to uDev.vendorId,
                                "productId" to uDev.productId,
                                "serialNumber" to serial
                            ))
                        }
                        result.success(list)
                    } catch (e: Exception) {
                        android.util.Log.e("FlashgardUSB", "getUsbDevices failed: ${e.message}", e)
                        result.error("USB_ERROR", e.message, null)
                    }
                }
                "isBluetoothEnabled" -> {
                    try {
                        val adapter = BluetoothAdapter.getDefaultAdapter()
                        result.success(adapter != null && adapter.isEnabled)
                    } catch (e: Exception) {
                        result.success(false)
                    }
                }
                "requestEnableBluetooth" -> {
                    try {
                        val adapter = BluetoothAdapter.getDefaultAdapter()
                        if (adapter == null) {
                            result.success(false)
                            return@setMethodCallHandler
                        }
                        if (adapter.isEnabled) {
                            result.success(true)
                            return@setMethodCallHandler
                        }
                        try {
                            val intent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
                            startActivity(intent)
                            result.success(true)
                        } catch (_: Exception) {
                            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                            startActivity(intent)
                            result.success(true)
                        }
                    } catch (e: Exception) {
                        try {
                            val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                            startActivity(intent)
                            result.success(true)
                        } catch (ex: Exception) {
                            result.error("ENABLE_BT_FAILED", ex.message, null)
                        }
                    }
                }
                "openBluetoothSettings" -> {
                    try {
                        val intent = Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("SETTINGS_FAILED", e.message, null)
                    }
                }
                "openOtgSettings" -> {
                    try {
                        val intents = listOf(
                            Intent("android.settings.OTG_SETTINGS"),
                            Intent("android.settings.SYSTEM_SETTINGS"),
                            Intent(Settings.ACTION_SETTINGS)
                        )
                        var launched = false
                        for (it in intents) {
                            try {
                                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                startActivity(it)
                                launched = true
                                break
                            } catch (_: Exception) {}
                        }
                        result.success(launched)
                    } catch (e: Exception) {
                        result.error("SETTINGS_FAILED", e.message, null)
                    }
                }
                "requestUsbPermission" -> {
                    val address = call.argument<String>("address")
                    val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                    val targetUsb = (if (address != null) manager.deviceList.values.find { it.deviceName == address } else null)
                        ?: usbDevice
                        ?: manager.deviceList.values.firstOrNull()

                    if (targetUsb != null) {
                        usbDevice = targetUsb
                        if (manager.hasPermission(targetUsb)) {
                            result.success(true)
                        } else {
                            pendingUsbResult = result
                            val flags = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                                PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                            } else {
                                PendingIntent.FLAG_UPDATE_CURRENT
                            }
                            val intent = Intent(ACTION_USB_PERMISSION).apply {
                                setPackage(packageName)
                            }
                            val pi = PendingIntent.getBroadcast(this, 0, intent, flags)
                            manager.requestPermission(targetUsb, pi)
                        }
                    } else {
                        result.error("NO_DEVICE", "No USB device found", null)
                    }
                }
                "testUsbPlotter" -> {
                    Thread {
                        try {
                            val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                            val dev = usbDevice ?: manager.deviceList.values.firstOrNull()
                            if (dev == null) {
                                runOnUiThread { result.error("NO_DEVICE", "No USB device attached", null) }
                                return@Thread
                            }
                            if (!manager.hasPermission(dev)) {
                                runOnUiThread { result.error("NO_PERMISSION", "USB permission not granted. Please allow access first.", null) }
                                return@Thread
                            }
                            var conn = usbConnection
                            var outEp = usbOutEndpoint
                            var inEp = usbInEndpoint

                            if (conn == null || outEp == null) {
                                conn = manager.openDevice(dev) ?: run {
                                    runOnUiThread { result.error("OPEN_FAIL", "Failed to open USB connection", null) }
                                    return@Thread
                                }
                                for (i in 0 until dev.interfaceCount) {
                                    val intf = dev.getInterface(i)
                                    for (j in 0 until intf.endpointCount) {
                                        val ep = intf.getEndpoint(j)
                                        if (ep.direction == UsbConstants.USB_DIR_OUT && outEp == null) outEp = ep
                                        if (ep.direction == UsbConstants.USB_DIR_IN && inEp == null) inEp = ep
                                    }
                                    if (outEp != null && conn.claimInterface(intf, true)) {
                                        usbInterface = intf
                                        break
                                    }
                                }
                                usbConnection = conn
                                usbOutEndpoint = outEp
                                usbInEndpoint = inEp
                                usbDevice = dev
                                connectionType = "usb"
                            }

                            if (outEp == null) {
                                runOnUiThread { result.error("NO_ENDPOINT", "No USB OUT endpoint found", null) }
                                return@Thread
                            }

                            // Send test enquiry / status packet (ESC + ENQ / 0x1B 0x05)
                            val testCommand = byteArrayOf(0x1B.toByte(), 0x05.toByte())
                            val sent = conn.bulkTransfer(outEp, testCommand, testCommand.size, 5000)

                            var responseStr = ""
                            if (inEp != null) {
                                val buffer = ByteArray(64)
                                val read = conn.bulkTransfer(inEp, buffer, buffer.size, 3000)
                                if (read > 0) {
                                    responseStr = String(buffer, 0, read, Charsets.US_ASCII)
                                }
                            }

                            runOnUiThread {
                                result.success(mapOf(
                                    "success" to (sent >= 0),
                                    "bytesSent" to sent,
                                    "response" to responseStr,
                                    "deviceName" to getUsbDeviceDisplayName(dev),
                                    "vendorId" to dev.vendorId,
                                    "productId" to dev.productId
                                ))
                            }
                        } catch (e: Exception) {
                            runOnUiThread { result.error("TEST_FAIL", e.message, null) }
                        }
                    }.start()
                }
                "sendCommand" -> {
                    val rawCmd = call.argument<String>("command") ?: return@setMethodCallHandler result.error("INVALID_ARGUMENT", "Command required", null)
                    val timeout = call.argument<Int>("timeout") ?: 3000

                    // Format command: Graphtec / Silhouette GP-GL commands end with \u0003 (ETX) or ';'
                    val formattedCmd = if (!rawCmd.endsWith("\u0003") && !rawCmd.endsWith(";")) {
                        rawCmd + "\u0003"
                    } else {
                        rawCmd
                    }
                    val cmdBytes = formattedCmd.toByteArray(Charsets.US_ASCII)

                    android.util.Log.i("FlashgardPlotterCmd", "Sending command: ${rawCmd.replace("\u0003", "<ETX>")} (bytes: ${cmdBytes.size}) via $connectionType")

                    Thread {
                        try {
                            if (connectionType == "classic") {
                                val socket = classicSocket ?: throw Exception("Bluetooth Classic socket not connected")
                                val outputStream = classicOutputStream ?: socket.outputStream ?: throw Exception("Bluetooth output stream unavailable")
                                val inputStream = socket.inputStream

                                // Discard any stale pending bytes before sending
                                try {
                                    while (inputStream.available() > 0) {
                                        inputStream.read()
                                    }
                                } catch (_: Exception) {}

                                outputStream.write(cmdBytes)
                                outputStream.flush()

                                // Read response bytes if available within timeout
                                val responseBuf = ByteArray(256)
                                var bytesRead = 0
                                val startTime = System.currentTimeMillis()
                                while (System.currentTimeMillis() - startTime < timeout) {
                                    if (inputStream.available() > 0) {
                                        val read = inputStream.read(responseBuf, bytesRead, responseBuf.size - bytesRead)
                                        if (read > 0) {
                                            bytesRead += read
                                            if (bytesRead >= responseBuf.size || responseBuf[bytesRead - 1] == 0x03.toByte() || responseBuf[bytesRead - 1] == 0x0A.toByte()) {
                                                break
                                            }
                                        }
                                    }
                                    Thread.sleep(25)
                                }

                                val respBytes = if (bytesRead > 0) responseBuf.copyOf(bytesRead) else ByteArray(0)
                                val respText = if (bytesRead > 0) String(respBytes, Charsets.US_ASCII) else ""
                                android.util.Log.i("FlashgardPlotterCmd", "Classic Response received (${respBytes.size} bytes): $respText")

                                runOnUiThread {
                                    result.success(mapOf(
                                        "success" to true,
                                        "bytesSent" to cmdBytes.size,
                                        "response" to respBytes,
                                        "text" to respText,
                                        "transport" to "classic"
                                    ))
                                }
                            } else if (connectionType == "usb") {
                                val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                                val dev = usbDevice ?: manager.deviceList.values.firstOrNull() ?: throw Exception("USB device not connected")
                                var conn = usbConnection
                                var outEp = usbOutEndpoint
                                var inEp = usbInEndpoint

                                if (conn == null || outEp == null) {
                                    conn = manager.openDevice(dev) ?: throw Exception("Failed to open USB device")
                                    for (i in 0 until dev.interfaceCount) {
                                        val intf = dev.getInterface(i)
                                        for (j in 0 until intf.endpointCount) {
                                            val ep = intf.getEndpoint(j)
                                            if (ep.direction == UsbConstants.USB_DIR_OUT && outEp == null) outEp = ep
                                            if (ep.direction == UsbConstants.USB_DIR_IN && inEp == null) inEp = ep
                                        }
                                        if (outEp != null && conn.claimInterface(intf, true)) {
                                            usbInterface = intf
                                            break
                                        }
                                    }
                                    usbConnection = conn
                                    usbOutEndpoint = outEp
                                    usbInEndpoint = inEp
                                    connectionType = "usb"
                                }

                                if (outEp == null) throw Exception("No USB OUT endpoint found")

                                val sent = conn.bulkTransfer(outEp, cmdBytes, cmdBytes.size, timeout)
                                if (sent < 0) throw Exception("USB bulk transfer failed ($sent)")

                                var respBytes = ByteArray(0)
                                var respText = ""
                                if (inEp != null) {
                                    val buffer = ByteArray(256)
                                    val read = conn.bulkTransfer(inEp, buffer, buffer.size, minOf(timeout, 1500))
                                    if (read > 0) {
                                        respBytes = buffer.copyOf(read)
                                        respText = String(respBytes, Charsets.US_ASCII)
                                    }
                                }
                                android.util.Log.i("FlashgardPlotterCmd", "USB Response received (${respBytes.size} bytes): $respText")

                                runOnUiThread {
                                    result.success(mapOf(
                                        "success" to true,
                                        "bytesSent" to sent,
                                        "response" to respBytes,
                                        "text" to respText,
                                        "transport" to "usb"
                                    ))
                                }
                            } else {
                                throw Exception("Plotter not connected (connectionType=$connectionType)")
                            }
                        } catch (e: Exception) {
                            android.util.Log.e("FlashgardPlotterCmd", "sendCommand error: ${e.message}", e)
                            runOnUiThread {
                                result.error("COMMAND_FAIL", e.message, null)
                            }
                        }
                    }.start()
                }
                "emergencyStop" -> {
                    android.util.Log.w("FlashgardPlotterCmd", "EMERGENCY STOP TRIGGERED!")
                    Thread {
                        try {
                            val stopCmd = byteArrayOf(0x1B.toByte(), 0x00.toByte(), 0x03.toByte()) + "PU;M0,0;\u0003".toByteArray(Charsets.US_ASCII)
                            if (connectionType == "classic") {
                                classicOutputStream?.write(stopCmd)
                                classicOutputStream?.flush()
                            } else if (connectionType == "usb") {
                                val conn = usbConnection
                                val ep = usbOutEndpoint
                                if (conn != null && ep != null) {
                                    conn.bulkTransfer(ep, stopCmd, stopCmd.size, 1000)
                                }
                            }
                            runOnUiThread { result.success(true) }
                        } catch (e: Exception) {
                            runOnUiThread { result.success(false) }
                        }
                    }.start()
                }
                "connect" -> {
                    val address = call.argument<String>("address") ?: return@setMethodCallHandler result.error("INVALID_ARGUMENT", "Address required", null)
                    val devType = call.argument<String>("type")

                    // 1. Check if target is a connected USB device
                    val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                    val uDev = manager.deviceList.values.find { it.deviceName == address }
                    if (devType == "usb" || uDev != null) {
                        val targetUsb = uDev ?: manager.deviceList.values.firstOrNull()
                        if (targetUsb != null) {
                            usbDevice = targetUsb
                            if (!manager.hasPermission(targetUsb)) {
                                pendingUsbResult = result
                                val flags = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                                    PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                                } else {
                                    PendingIntent.FLAG_UPDATE_CURRENT
                                }
                                val intent = Intent(ACTION_USB_PERMISSION).apply {
                                    setPackage(packageName)
                                }
                                val pi = PendingIntent.getBroadcast(this, 0, intent, flags)
                                manager.requestPermission(targetUsb, pi)
                            } else {
                                finishUsbConnect(targetUsb, result)
                            }
                        } else {
                            result.error("CONNECT_FAIL", "No USB plotter detected. Please plug in your OTG cable, power ON the plotter, and ensure OTG is enabled in phone settings.", null)
                        }
                        return@setMethodCallHandler
                    }
                    
                    val adapter = BluetoothAdapter.getDefaultAdapter()
                    if (adapter == null || !adapter.isEnabled) {
                        result.error("BLUETOOTH_OFF", "Bluetooth is turned off on this device. Please turn on Bluetooth to connect.", null)
                        return@setMethodCallHandler
                    }

                    try {
                        adapter.cancelDiscovery()
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
                                    lastConnectedName = name
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
                    if (connectionType == "usb") {
                        disconnectUsb()
                    } else if (connectionType == "classic") {
                        disconnectClassic()
                    } else {
                        sdk.disConnected()
                        connectionType = null
                    }
                    result.success(true)
                }
                "reset" -> {
                    if (connectionType == "usb") {
                        Thread {
                            try {
                                val conn = usbConnection
                                val ep = usbOutEndpoint
                                if (conn != null && ep != null) {
                                    val resetData = "IN;\u0003".toByteArray(Charsets.UTF_8)
                                    conn.bulkTransfer(ep, resetData, resetData.size, 2000)
                                }
                                runOnUiThread { result.success(true) }
                            } catch (e: Exception) {
                                runOnUiThread { result.error("RESET_FAIL", e.message, null) }
                            }
                        }.start()
                    } else if (connectionType == "classic") {
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
                        "usb" -> {
                            val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                            val dev = usbDevice ?: manager.deviceList.values.firstOrNull()
                            dev != null && manager.hasPermission(dev)
                        }
                        "sdk" -> sdk.isConnected()
                        "classic" -> classicSocket?.isConnected == true
                        else -> {
                            // If USB device is attached and has permission, restore connection seamlessly
                            val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                            val dev = usbDevice ?: manager.deviceList.values.firstOrNull()
                            if (dev != null && manager.hasPermission(dev)) {
                                usbDevice = dev
                                connectionType = "usb"
                                true
                            } else {
                                false
                            }
                        }
                    }
                    result.success(connected)
                }
                "getConnectionType" -> {
                    result.success(connectionType)
                }

                "getPageSize" -> {
                    if (connectionType == "usb" || connectionType == "classic") {
                        // Plotters on USB / Classic return standard defaults
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
                    if (connectionType == "usb" || connectionType == "classic") {
                        // Return default parameters
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
                                    override fun onError(code: Int, msg: String?) { runOnUiThread { result.error("QUERY_ERROR", msg ?: "Error code: $code", code) } }
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
                    val content = call.argument<String>("content") ?: return@setMethodCallHandler result.error("INVALID_ARGUMENT", "Content required", null)
                    val name = call.argument<String>("name") ?: "cut"
                    val speed = call.argument<Int>("speed") ?: 300
                    val force = call.argument<Int>("force") ?: 33
                    val passes = call.argument<Int>("passes") ?: 1
                    val plotterNameArg = call.argument<String>("plotterName")
                    val width = call.argument<Double>("width") ?: 180.0
                    val height = call.argument<Double>("height") ?: 297.0

                    val targetName = plotterNameArg ?: lastConnectedName ?: ""
                    val isPortrait = targetName.contains("Portrait", ignoreCase = true) ||
                                     targetName.contains("Cameo", ignoreCase = true) ||
                                     (connectionType == "usb" && usbDevice?.vendorId == 0x0B4D) ||
                                     (lastConnectedAddress?.let { 
                                         try { BluetoothAdapter.getDefaultAdapter()?.getRemoteDevice(it)?.name?.contains("Portrait", ignoreCase = true) } 
                                         catch (_: Exception) { false } 
                                     } == true)

                    val gpglForce = force

                    // Silhouette Portrait 2 Speed scale: 1 to 10 (cm/s, where 10 = 100 mm/s)
                    // Slower speed (1..3 = 10..30 mm/s) ensures blade sinks fully and cuts deeply without skipping
                    val gpglSpeed = when {
                        speed in 1..10 -> speed
                        speed in 11..100 -> (speed / 10).coerceIn(1, 10)
                        else -> (speed / 100).coerceIn(1, 10)
                    }

                    val startString = call.argument<String>("startString") ?: "IN;PA;"
                    val endString = call.argument<String>("endString") ?: "\u0003"
                    val xySeparator = call.argument<String>("xySeparator") ?: ","
                    val splitCommands = call.argument<Boolean>("splitCommands") ?: false
                    val mirrorX = call.argument<Boolean>("mirrorX") ?: false
                    val mirrorY = call.argument<Boolean>("mirrorY") ?: false

                    if (connectionType == "usb") {
                        // === USB OTG: Send raw PLT data via bulk OUT endpoint ===
                        Thread {
                            try {
                                val manager = usbManager ?: (getSystemService(Context.USB_SERVICE) as UsbManager)
                                val dev = usbDevice ?: manager.deviceList.values.firstOrNull()
                                    ?: throw Exception("No USB plotter detected. Please connect OTG cable and power ON the plotter.")

                                var conn = usbConnection
                                var ep = usbOutEndpoint
                                var intf = usbInterface

                                // Auto-reconnect / open on demand if closed, exactly like Xamarin USBService.SendCut
                                if (conn == null || ep == null || intf == null) {
                                    conn = manager.openDevice(dev) ?: throw Exception("Failed to open USB plotter connection.")
                                    for (i in 0 until dev.interfaceCount) {
                                        val testIntf = dev.getInterface(i)
                                        for (j in 0 until testIntf.endpointCount) {
                                            val testEp = testIntf.getEndpoint(j)
                                            if (testEp.direction == UsbConstants.USB_DIR_OUT) {
                                                if (conn.claimInterface(testIntf, true)) {
                                                    intf = testIntf
                                                    ep = testEp
                                                    break
                                                }
                                            }
                                        }
                                        if (ep != null) break
                                    }
                                    if (ep == null && dev.interfaceCount > 0) {
                                        val intf0 = dev.getInterface(0)
                                        conn.claimInterface(intf0, true)
                                        intf = intf0
                                        ep = if (intf0.endpointCount > 0) intf0.getEndpoint(0) else null
                                    }
                                    usbConnection = conn
                                    usbInterface = intf
                                    usbOutEndpoint = ep
                                }

                                if (conn == null || ep == null) {
                                    throw Exception("USB OUT endpoint not available.")
                                }

                                // Match legacy Xamarin ModelCutPage: Regex.Replace(cutString, @"(?<=SP1;).*?(?=M)", "")
                                var rawContent = content
                                val sp1MPattern = Regex("(?<=SP1;).*?(?=M)", RegexOption.IGNORE_CASE)
                                rawContent = sp1MPattern.replace(rawContent, "")

                                val initPrefixRegex = Regex("^(?:IN;|PA;|SP\\d+;)+", RegexOption.IGNORE_CASE)
                                val cleanContent = initPrefixRegex.replace(rawContent.trim(), "")

                                val initialRegex = Regex("([A-Za-z]+)(-?\\d+),(-?\\d+)")
                                var minX = Float.MAX_VALUE; var maxX = Float.MIN_VALUE
                                var minY = Float.MAX_VALUE; var maxY = Float.MIN_VALUE

                                initialRegex.findAll(cleanContent).forEach { match ->
                                    val x = match.groupValues[2].toFloat()
                                    val y = match.groupValues[3].toFloat()
                                    if (x < minX) minX = x; if (x > maxX) maxX = x
                                    if (y < minY) minY = y; if (y > maxY) maxY = y
                                }

                                val designCenterX = (minX + maxX) / 2
                                val targetCenterX = (width * 40 / 2).toFloat()
                                val offsetX = targetCenterX - designCenterX
                                val marginY = 400.0f

                                val coordRegex = Regex("([A-Za-z]+)(-?\\d+)(?:,(-?\\d+))?")
                                val finalContent = if (isPortrait) {
                                    val gpglBody = cleanContent.replace(coordRegex) { match ->
                                        val cmd = match.groupValues[1]
                                        val xStr = match.groupValues[2]
                                        val yStr = match.groupValues[3]
                                        if (yStr.isNotEmpty()) {
                                            val rawX = xStr.toFloat()
                                            val rawY = yStr.toFloat()
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
                                    val start = "IN; \\30,30 FX$gpglForce,1 !$gpglSpeed,1 LT;SP1;"
                                    val end = "M0 0;\u0003"
                                    val cutBody = if (passes > 1) {
                                        val sb = java.lang.StringBuilder()
                                        for (p in 1..passes) {
                                            sb.append(gpglBody.trim())
                                        }
                                        sb.toString()
                                    } else {
                                        gpglBody.trim()
                                    }
                                    android.util.Log.i("FlashgardPlotterCmd", "USB OTG Portrait Cut: force=$gpglForce, speed=$gpglSpeed/10, passes=$passes")
                                    start + cutBody + end
                                } else {
                                    val scaledContent = cleanContent.replace(coordRegex) { match ->
                                        val cmd = match.groupValues[1]
                                        val xStr = match.groupValues[2]
                                        val yStr = match.groupValues[3]

                                        if (yStr.isNotEmpty()) {
                                            var rawX = xStr.toFloat()
                                            var rawY = yStr.toFloat()
                                            if (mirrorX) rawX = (minX + maxX) - rawX
                                            if (mirrorY) rawY = (minY + maxY) - rawY
                                            val x = ((rawX + offsetX) * 1.0f).toInt()
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
                                    val cutBody = if (passes > 1) {
                                        val sb = java.lang.StringBuilder()
                                        for (p in 1..passes) {
                                            sb.append(scaledContent.trim())
                                        }
                                        sb.toString()
                                    } else {
                                        scaledContent.trim()
                                    }
                                    startString + cutBody + endString
                                }
                                val data = finalContent.toByteArray(Charsets.UTF_8)
                                val totalBytes = data.size
                                var offset = 0
                                val chunkSize = 2048

                                while (offset < totalBytes) {
                                    val len = minOf(chunkSize, totalBytes - offset)
                                    val chunk = data.copyOfRange(offset, offset + len)
                                    // Generous timeout (60s) allowing plotter buffer to execute cut motion smoothly
                                    val transferred = conn.bulkTransfer(ep, chunk, len, 60000)
                                    if (transferred < 0) {
                                        throw IOException("USB bulk transfer failed with status $transferred")
                                    }
                                    offset += len
                                    val progress = (offset * 100 / totalBytes)
                                    runOnUiThread { progressSink?.success(progress) }
                                    Thread.sleep(10)
                                }

                                runOnUiThread { result.success(true) }
                            } catch (e: Exception) {
                                runOnUiThread { result.error("CUT_FAIL", e.message, null) }
                            }
                        }.start()
                    } else if (connectionType == "classic") {
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
                                      val start = "IN; \\30,30 FX$gpglForce,1 !$gpglSpeed,1 LT;SP1;"
                                      val end = "M0 0;\u0003"
                                      val cutBody = if (passes > 1) {
                                          val sb = java.lang.StringBuilder()
                                          for (p in 1..passes) {
                                              sb.append(gpglBody.trim())
                                          }
                                          sb.toString()
                                      } else {
                                          gpglBody.trim()
                                      }
                                      android.util.Log.i("FlashgardPlotterCmd", "Classic Bluetooth Portrait Cut: force=$gpglForce, speed=$gpglSpeed/10, passes=$passes")
                                      start + cutBody + end
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
                                     val cutBody = if (passes > 1) {
                                         val sb = java.lang.StringBuilder()
                                         for (p in 1..passes) {
                                             sb.append(scaledContent.trim())
                                         }
                                         sb.toString()
                                     } else {
                                         scaledContent.trim()
                                     }
                                     startString + cutBody + endString
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
