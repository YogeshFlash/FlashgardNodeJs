/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.annotation.TargetApi
 *  android.bluetooth.BluetoothAdapter$LeScanCallback
 *  android.bluetooth.BluetoothDevice
 */
package com.inuker.bluetooth.library.search.b;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import com.inuker.bluetooth.library.e.b;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.e;

public class a
extends e {
    private final BluetoothAdapter.LeScanCallback c = new BluetoothAdapter.LeScanCallback(){

        public void onLeScan(BluetoothDevice bluetoothDevice, int n2, byte[] byArray) {
            a.this.a(new SearchResult(bluetoothDevice, n2, byArray));
        }
    };

    private a() {
        this.a = com.inuker.bluetooth.library.e.b.h();
    }

    public static a c() {
        return com.inuker.bluetooth.library.search.b.a$a.a;
    }

    @Override
    @TargetApi(value=18)
    public void a(com.inuker.bluetooth.library.search.c.a a2) {
        super.a(a2);
        this.a.startLeScan(this.c);
    }

    @Override
    @TargetApi(value=18)
    public void a() {
        try {
            this.a.stopLeScan(this.c);
        }
        catch (Exception exception) {
            com.inuker.bluetooth.library.e.a.a(exception);
        }
        super.a();
    }

    @Override
    @TargetApi(value=18)
    protected void b() {
        this.a.stopLeScan(this.c);
        super.b();
    }

    private static class a {
        private static a a = new a();

        private a() {
        }
    }
}

