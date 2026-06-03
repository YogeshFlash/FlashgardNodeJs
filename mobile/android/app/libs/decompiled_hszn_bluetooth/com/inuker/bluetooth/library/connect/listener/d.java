/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGattCharacteristic
 *  android.bluetooth.BluetoothGattDescriptor
 */
package com.inuker.bluetooth.library.connect.listener;

import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;

public interface d {
    public void a(int var1, int var2);

    public void a(int var1);

    public void a(BluetoothGattCharacteristic var1, int var2, byte[] var3);

    public void b(BluetoothGattCharacteristic var1, int var2, byte[] var3);

    public void a(BluetoothGattCharacteristic var1, byte[] var2);

    public void a(BluetoothGattDescriptor var1, int var2, byte[] var3);

    public void a(BluetoothGattDescriptor var1, int var2);

    public void b(int var1, int var2);

    public void c(int var1, int var2);
}

