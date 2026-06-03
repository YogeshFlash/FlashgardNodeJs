/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.app.Service
 *  android.content.Context
 *  android.content.Intent
 *  android.os.IBinder
 */
package com.inuker.bluetooth.library;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.IBinder;
import com.inuker.bluetooth.library.d;
import com.inuker.bluetooth.library.e.a;
import com.inuker.bluetooth.library.f;

public class e
extends Service {
    private static Context a;

    public static Context a() {
        return a;
    }

    public void onCreate() {
        super.onCreate();
        com.inuker.bluetooth.library.e.a.c(String.format("BluetoothService onCreate", new Object[0]));
        a = this.getApplicationContext();
        d.a(a);
    }

    public IBinder onBind(Intent intent) {
        com.inuker.bluetooth.library.e.a.c(String.format("BluetoothService onBind", new Object[0]));
        return f.a();
    }
}

