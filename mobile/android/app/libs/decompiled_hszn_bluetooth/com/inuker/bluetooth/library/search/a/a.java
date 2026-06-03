/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothDevice
 *  android.content.BroadcastReceiver
 *  android.content.Context
 *  android.content.Intent
 *  android.content.IntentFilter
 */
package com.inuker.bluetooth.library.search.a;

import android.bluetooth.BluetoothDevice;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.e;

public class a
extends e {
    private b c;

    private a() {
        this.a = com.inuker.bluetooth.library.e.b.h();
    }

    public static a c() {
        return com.inuker.bluetooth.library.search.a.a$a.a;
    }

    @Override
    public void a(com.inuker.bluetooth.library.search.c.a a2) {
        super.a(a2);
        this.d();
        if (this.a.isDiscovering()) {
            this.a.cancelDiscovery();
        }
        this.a.startDiscovery();
    }

    @Override
    public void a() {
        this.e();
        if (this.a.isDiscovering()) {
            this.a.cancelDiscovery();
        }
        super.a();
    }

    @Override
    protected void b() {
        this.e();
        if (this.a.isDiscovering()) {
            this.a.cancelDiscovery();
        }
        super.b();
    }

    private void d() {
        if (this.c == null) {
            this.c = new b();
            com.inuker.bluetooth.library.e.b.a(this.c, new IntentFilter("android.bluetooth.device.action.FOUND"));
        }
    }

    private void e() {
        if (this.c != null) {
            com.inuker.bluetooth.library.e.b.a(this.c);
            this.c = null;
        }
    }

    private class b
    extends BroadcastReceiver {
        private b() {
        }

        public void onReceive(Context context, Intent intent) {
            if (intent.getAction().equals("android.bluetooth.device.action.FOUND")) {
                BluetoothDevice bluetoothDevice = (BluetoothDevice)intent.getParcelableExtra("android.bluetooth.device.extra.DEVICE");
                short s = intent.getShortExtra("android.bluetooth.device.extra.RSSI", (short)Short.MIN_VALUE);
                SearchResult searchResult = new SearchResult(bluetoothDevice, s, null);
                a.this.a(searchResult);
            }
        }
    }

    private static class a {
        private static a a = new a();

        private a() {
        }
    }
}

