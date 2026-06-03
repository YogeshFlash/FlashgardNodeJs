/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.annotation.TargetApi
 *  android.bluetooth.BluetoothAdapter
 *  android.bluetooth.BluetoothDevice
 *  android.bluetooth.BluetoothGatt
 *  android.bluetooth.BluetoothManager
 *  android.content.BroadcastReceiver
 *  android.content.Context
 *  android.content.Intent
 *  android.content.IntentFilter
 *  android.os.Build$VERSION
 *  android.os.Handler
 *  android.os.Looper
 *  android.text.TextUtils
 */
package com.inuker.bluetooth.library.e;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import com.inuker.bluetooth.library.d;
import com.inuker.bluetooth.library.e.a;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

public class b {
    private static BluetoothManager a;
    private static BluetoothAdapter b;
    private static Handler c;

    public static Context a() {
        return d.a();
    }

    private static Handler l() {
        if (c == null) {
            c = new Handler(Looper.getMainLooper());
        }
        return c;
    }

    public static void a(Runnable runnable) {
        com.inuker.bluetooth.library.e.b.l().post(runnable);
    }

    public static void a(BroadcastReceiver broadcastReceiver, IntentFilter intentFilter) {
        com.inuker.bluetooth.library.e.b.b(broadcastReceiver, intentFilter);
    }

    private static void b(BroadcastReceiver broadcastReceiver, IntentFilter intentFilter) {
        com.inuker.bluetooth.library.e.b.a().registerReceiver(broadcastReceiver, intentFilter);
    }

    public static void a(BroadcastReceiver broadcastReceiver) {
        com.inuker.bluetooth.library.e.b.b(broadcastReceiver);
    }

    private static void b(BroadcastReceiver broadcastReceiver) {
        com.inuker.bluetooth.library.e.b.a().unregisterReceiver(broadcastReceiver);
    }

    public static void a(Intent intent) {
        com.inuker.bluetooth.library.e.b.b(intent);
    }

    public static void a(String string) {
        com.inuker.bluetooth.library.e.b.b(new Intent(string));
    }

    private static void b(Intent intent) {
        com.inuker.bluetooth.library.e.b.a().sendBroadcast(intent);
    }

    public static boolean b() {
        return Build.VERSION.SDK_INT >= 18 && com.inuker.bluetooth.library.e.b.a() != null && com.inuker.bluetooth.library.e.b.a().getPackageManager().hasSystemFeature("android.hardware.bluetooth_le");
    }

    public static boolean c() {
        return com.inuker.bluetooth.library.e.b.d() == 12;
    }

    public static int d() {
        BluetoothAdapter bluetoothAdapter = com.inuker.bluetooth.library.e.b.h();
        return bluetoothAdapter != null ? bluetoothAdapter.getState() : 0;
    }

    public static boolean e() {
        BluetoothAdapter bluetoothAdapter = com.inuker.bluetooth.library.e.b.h();
        if (bluetoothAdapter != null) {
            return bluetoothAdapter.enable();
        }
        return false;
    }

    public static boolean f() {
        BluetoothAdapter bluetoothAdapter = com.inuker.bluetooth.library.e.b.h();
        if (bluetoothAdapter != null) {
            return bluetoothAdapter.disable();
        }
        return false;
    }

    public static BluetoothManager g() {
        if (com.inuker.bluetooth.library.e.b.b()) {
            if (a == null) {
                a = (BluetoothManager)com.inuker.bluetooth.library.e.b.a().getSystemService("bluetooth");
            }
            return a;
        }
        return null;
    }

    public static BluetoothAdapter h() {
        if (b == null) {
            b = BluetoothAdapter.getDefaultAdapter();
        }
        return b;
    }

    public static BluetoothDevice b(String string) {
        BluetoothAdapter bluetoothAdapter;
        if (!TextUtils.isEmpty((CharSequence)string) && (bluetoothAdapter = com.inuker.bluetooth.library.e.b.h()) != null) {
            return bluetoothAdapter.getRemoteDevice(string);
        }
        return null;
    }

    @TargetApi(value=18)
    public static List<BluetoothDevice> i() {
        ArrayList<BluetoothDevice> arrayList = new ArrayList<BluetoothDevice>();
        BluetoothManager bluetoothManager = com.inuker.bluetooth.library.e.b.g();
        if (bluetoothManager != null) {
            arrayList.addAll(bluetoothManager.getConnectedDevices(7));
        }
        return arrayList;
    }

    @TargetApi(value=18)
    public static int c(String string) {
        BluetoothManager bluetoothManager = com.inuker.bluetooth.library.e.b.g();
        if (bluetoothManager != null) {
            try {
                BluetoothDevice bluetoothDevice = com.inuker.bluetooth.library.e.b.b(string);
                return bluetoothManager.getConnectionState(bluetoothDevice, 7);
            }
            catch (Throwable throwable) {
                com.inuker.bluetooth.library.e.a.a(throwable);
            }
        }
        return -1;
    }

    public static int d(String string) {
        BluetoothManager bluetoothManager = com.inuker.bluetooth.library.e.b.g();
        if (bluetoothManager != null) {
            try {
                BluetoothDevice bluetoothDevice = com.inuker.bluetooth.library.e.b.b(string);
                return bluetoothDevice.getBondState();
            }
            catch (Throwable throwable) {
                com.inuker.bluetooth.library.e.a.a(throwable);
            }
        }
        return 10;
    }

    public static List<BluetoothDevice> j() {
        Set set;
        BluetoothAdapter bluetoothAdapter = com.inuker.bluetooth.library.e.b.h();
        ArrayList<BluetoothDevice> arrayList = new ArrayList<BluetoothDevice>();
        if (bluetoothAdapter != null && (set = bluetoothAdapter.getBondedDevices()) != null) {
            arrayList.addAll(set);
        }
        return arrayList;
    }

    @TargetApi(value=18)
    public static boolean e(String string) {
        if (!TextUtils.isEmpty((CharSequence)string) && com.inuker.bluetooth.library.e.b.b()) {
            BluetoothDevice bluetoothDevice = com.inuker.bluetooth.library.e.b.h().getRemoteDevice(string);
            return com.inuker.bluetooth.library.e.b.g().getConnectionState(bluetoothDevice, 7) == 2;
        }
        return false;
    }

    public static boolean k() {
        return Looper.myLooper() == Looper.getMainLooper();
    }

    public static boolean a(BluetoothGatt bluetoothGatt) {
        boolean bl = false;
        try {
            Method method;
            if (bluetoothGatt != null && (method = BluetoothGatt.class.getMethod("refresh", new Class[0])) != null) {
                method.setAccessible(true);
                bl = (Boolean)method.invoke(bluetoothGatt, new Object[0]);
            }
        }
        catch (Exception exception) {
            com.inuker.bluetooth.library.e.a.a(exception);
        }
        com.inuker.bluetooth.library.e.a.c(String.format("refreshDeviceCache return %b", bl));
        return bl;
    }
}

