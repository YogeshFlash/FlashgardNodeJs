/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.cc.listener;

public interface IBluetoothConnectListener {
    public void onConnected(String var1, String var2);

    public void onError(String var1);

    public void onError(int var1);
}

