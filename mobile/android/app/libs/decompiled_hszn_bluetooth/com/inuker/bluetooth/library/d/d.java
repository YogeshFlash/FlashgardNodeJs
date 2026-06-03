/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothDevice
 *  android.content.Context
 *  android.content.Intent
 */
package com.inuker.bluetooth.library.d;

import android.bluetooth.BluetoothDevice;
import android.content.Context;
import android.content.Intent;
import com.inuker.bluetooth.library.d.a;
import com.inuker.bluetooth.library.d.a.e;
import com.inuker.bluetooth.library.d.a.g;
import com.inuker.bluetooth.library.d.h;
import java.util.Arrays;
import java.util.List;

public class d
extends a {
    private static final String[] d = new String[]{"android.bluetooth.device.action.BOND_STATE_CHANGED"};

    protected d(h h2) {
        super(h2);
    }

    public static d a(h h2) {
        return new d(h2);
    }

    @Override
    List<String> a() {
        return Arrays.asList(d);
    }

    @Override
    boolean a(Context context, Intent intent) {
        BluetoothDevice bluetoothDevice = (BluetoothDevice)intent.getParcelableExtra("android.bluetooth.device.extra.DEVICE");
        int n2 = intent.getIntExtra("android.bluetooth.device.extra.BOND_STATE", -1);
        if (bluetoothDevice != null) {
            this.a(bluetoothDevice.getAddress(), n2);
        }
        return true;
    }

    private void a(String string, int n2) {
        List<g> list = this.a(e.class);
        for (g g2 : list) {
            g2.invoke(string, n2);
        }
    }
}

