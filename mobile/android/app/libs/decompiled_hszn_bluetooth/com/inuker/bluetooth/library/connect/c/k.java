/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothGatt
 *  android.bluetooth.BluetoothGattCallback
 *  android.bluetooth.BluetoothGattCharacteristic
 *  android.bluetooth.BluetoothGattDescriptor
 */
package com.inuker.bluetooth.library.connect.c;

import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import com.inuker.bluetooth.library.connect.listener.d;

public class k
extends BluetoothGattCallback {
    private d a;

    public k(d d2) {
        this.a = d2;
    }

    public void onConnectionStateChange(BluetoothGatt bluetoothGatt, int n2, int n3) {
        this.a.a(n2, n3);
    }

    public void onServicesDiscovered(BluetoothGatt bluetoothGatt, int n2) {
        this.a.a(n2);
    }

    public void onCharacteristicRead(BluetoothGatt bluetoothGatt, BluetoothGattCharacteristic bluetoothGattCharacteristic, int n2) {
        this.a.a(bluetoothGattCharacteristic, n2, bluetoothGattCharacteristic.getValue());
    }

    public void onCharacteristicWrite(BluetoothGatt bluetoothGatt, BluetoothGattCharacteristic bluetoothGattCharacteristic, int n2) {
        this.a.b(bluetoothGattCharacteristic, n2, bluetoothGattCharacteristic.getValue());
    }

    public void onCharacteristicChanged(BluetoothGatt bluetoothGatt, BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        this.a.a(bluetoothGattCharacteristic, bluetoothGattCharacteristic.getValue());
    }

    public void onDescriptorWrite(BluetoothGatt bluetoothGatt, BluetoothGattDescriptor bluetoothGattDescriptor, int n2) {
        this.a.a(bluetoothGattDescriptor, n2);
    }

    public void onDescriptorRead(BluetoothGatt bluetoothGatt, BluetoothGattDescriptor bluetoothGattDescriptor, int n2) {
        this.a.a(bluetoothGattDescriptor, n2, bluetoothGattDescriptor.getValue());
    }

    public void onReadRemoteRssi(BluetoothGatt bluetoothGatt, int n2, int n3) {
        this.a.b(n2, n3);
    }

    public void onMtuChanged(BluetoothGatt bluetoothGatt, int n2, int n3) {
        this.a.c(n2, n3);
    }
}

