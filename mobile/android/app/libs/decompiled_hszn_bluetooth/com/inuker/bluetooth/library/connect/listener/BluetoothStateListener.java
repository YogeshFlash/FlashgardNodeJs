/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.connect.listener;

import com.inuker.bluetooth.library.d.a.f;

public abstract class BluetoothStateListener
extends f {
    public abstract void onBluetoothStateChanged(boolean var1);

    @Override
    public void onSyncInvoke(Object ... objectArray) {
        boolean bl = (Boolean)objectArray[0];
        this.onBluetoothStateChanged(bl);
    }
}

