/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.annotation.TargetApi
 *  android.bluetooth.BluetoothAdapter
 *  android.bluetooth.BluetoothDevice
 *  android.bluetooth.BluetoothGatt
 *  android.bluetooth.BluetoothGattCallback
 *  android.bluetooth.BluetoothGattCharacteristic
 *  android.bluetooth.BluetoothGattDescriptor
 *  android.bluetooth.BluetoothGattService
 *  android.content.Context
 *  android.content.Intent
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 */
package com.inuker.bluetooth.library.connect;

import android.annotation.TargetApi;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothGatt;
import android.bluetooth.BluetoothGattCallback;
import android.bluetooth.BluetoothGattCharacteristic;
import android.bluetooth.BluetoothGattDescriptor;
import android.bluetooth.BluetoothGattService;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import com.inuker.bluetooth.library.connect.c.k;
import com.inuker.bluetooth.library.connect.listener.c;
import com.inuker.bluetooth.library.connect.listener.e;
import com.inuker.bluetooth.library.connect.listener.f;
import com.inuker.bluetooth.library.connect.listener.g;
import com.inuker.bluetooth.library.connect.listener.h;
import com.inuker.bluetooth.library.connect.listener.i;
import com.inuker.bluetooth.library.connect.listener.j;
import com.inuker.bluetooth.library.e.b;
import com.inuker.bluetooth.library.e.b.a;
import com.inuker.bluetooth.library.m;
import java.io.Serializable;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class d
implements Handler.Callback,
com.inuker.bluetooth.library.connect.g,
com.inuker.bluetooth.library.connect.listener.d,
com.inuker.bluetooth.library.e.b.b,
m {
    private static final int a = 288;
    private BluetoothGatt b;
    private BluetoothDevice c;
    private c d;
    private Handler e;
    private volatile int f;
    private com.inuker.bluetooth.library.c.c g;
    private Map<UUID, Map<UUID, BluetoothGattCharacteristic>> h;
    private com.inuker.bluetooth.library.connect.listener.d i;
    private m j;

    public d(String string, m m2) {
        BluetoothAdapter bluetoothAdapter = com.inuker.bluetooth.library.e.b.h();
        if (bluetoothAdapter == null) {
            throw new IllegalStateException("ble adapter null");
        }
        this.c = bluetoothAdapter.getRemoteDevice(string);
        this.j = m2;
        this.e = new Handler(Looper.myLooper(), (Handler.Callback)this);
        this.h = new HashMap<UUID, Map<UUID, BluetoothGattCharacteristic>>();
        this.i = (com.inuker.bluetooth.library.connect.listener.d)com.inuker.bluetooth.library.e.b.d.a((Object)this, com.inuker.bluetooth.library.connect.listener.d.class, (com.inuker.bluetooth.library.e.b.b)this);
    }

    private void i() {
        com.inuker.bluetooth.library.e.a.c(String.format("refreshServiceProfile for %s", this.c.getAddress()));
        List list = this.b.getServices();
        HashMap hashMap = new HashMap();
        for (BluetoothGattService bluetoothGattService : list) {
            UUID uUID = bluetoothGattService.getUuid();
            HashMap<UUID, BluetoothGattCharacteristic> hashMap2 = (HashMap<UUID, BluetoothGattCharacteristic>)hashMap.get(uUID);
            if (hashMap2 == null) {
                com.inuker.bluetooth.library.e.a.c("Service: " + uUID);
                hashMap2 = new HashMap<UUID, BluetoothGattCharacteristic>();
                hashMap.put(bluetoothGattService.getUuid(), hashMap2);
            }
            List list2 = bluetoothGattService.getCharacteristics();
            for (BluetoothGattCharacteristic bluetoothGattCharacteristic : list2) {
                UUID uUID2 = bluetoothGattCharacteristic.getUuid();
                com.inuker.bluetooth.library.e.a.c("character: uuid = " + uUID2);
                hashMap2.put(bluetoothGattCharacteristic.getUuid(), bluetoothGattCharacteristic);
            }
        }
        this.h.clear();
        this.h.putAll(hashMap);
        this.g = new com.inuker.bluetooth.library.c.c(this.h);
    }

    private BluetoothGattCharacteristic b(UUID uUID, UUID uUID2) {
        BluetoothGattService bluetoothGattService;
        BluetoothGattCharacteristic bluetoothGattCharacteristic = null;
        if (uUID != null && uUID2 != null && (bluetoothGattService = this.h.get(uUID)) != null) {
            bluetoothGattCharacteristic = (BluetoothGattCharacteristic)bluetoothGattService.get(uUID2);
        }
        if (bluetoothGattCharacteristic == null && this.b != null && (bluetoothGattService = this.b.getService(uUID)) != null) {
            bluetoothGattCharacteristic = bluetoothGattService.getCharacteristic(uUID2);
        }
        return bluetoothGattCharacteristic;
    }

    private void c(int n2) {
        com.inuker.bluetooth.library.e.a.c(String.format("setConnectStatus status = %s", com.inuker.bluetooth.library.i.a(n2)));
        this.f = n2;
    }

    @Override
    public void a(int n2, int n3) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onConnectionStateChange for %s: status = %d, newState = %d", this.c.getAddress(), n2, n3));
        if (n2 == 0 && n3 == 2) {
            this.c(2);
            if (this.d != null) {
                this.d.a(true);
            }
        } else {
            this.c();
        }
    }

    @Override
    public void a(int n2) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onServicesDiscovered for %s: status = %d", this.c.getAddress(), n2));
        if (n2 == 0) {
            this.c(19);
            this.d(16);
            this.i();
        }
        if (this.d != null && this.d instanceof i) {
            ((i)this.d).a(n2, this.g);
        }
    }

    @Override
    public void a(BluetoothGattCharacteristic bluetoothGattCharacteristic, int n2, byte[] byArray) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onCharacteristicRead for %s: status = %d, service = 0x%s, character = 0x%s, value = %s", this.c.getAddress(), n2, bluetoothGattCharacteristic.getService().getUuid(), bluetoothGattCharacteristic.getUuid(), com.inuker.bluetooth.library.e.c.b(byArray)));
        if (this.d != null && this.d instanceof e) {
            ((e)this.d).a(bluetoothGattCharacteristic, n2, byArray);
        }
    }

    @Override
    public void b(BluetoothGattCharacteristic bluetoothGattCharacteristic, int n2, byte[] byArray) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onCharacteristicWrite for %s: status = %d, service = 0x%s, character = 0x%s, value = %s", this.c.getAddress(), n2, bluetoothGattCharacteristic.getService().getUuid(), bluetoothGattCharacteristic.getUuid(), com.inuker.bluetooth.library.e.c.b(byArray)));
        if (this.d != null && this.d instanceof j) {
            ((j)this.d).a(bluetoothGattCharacteristic, n2, byArray);
        }
    }

    @Override
    public void a(BluetoothGattCharacteristic bluetoothGattCharacteristic, byte[] byArray) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onCharacteristicChanged for %s: value = %s, service = 0x%s, character = 0x%s", this.c.getAddress(), com.inuker.bluetooth.library.e.c.b(byArray), bluetoothGattCharacteristic.getService().getUuid(), bluetoothGattCharacteristic.getUuid()));
        this.c(bluetoothGattCharacteristic.getService().getUuid(), bluetoothGattCharacteristic.getUuid(), byArray);
    }

    @Override
    public void a(BluetoothGattDescriptor bluetoothGattDescriptor, int n2, byte[] byArray) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onDescriptorRead for %s: status = %d, service = 0x%s, character = 0x%s, descriptor = 0x%s", this.c.getAddress(), n2, bluetoothGattDescriptor.getCharacteristic().getService().getUuid(), bluetoothGattDescriptor.getCharacteristic().getUuid(), bluetoothGattDescriptor.getUuid()));
        if (this.d != null && this.d instanceof f) {
            ((f)this.d).a(bluetoothGattDescriptor, n2, byArray);
        }
    }

    @Override
    public void a(BluetoothGattDescriptor bluetoothGattDescriptor, int n2) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onDescriptorWrite for %s: status = %d, service = 0x%s, character = 0x%s, descriptor = 0x%s", this.c.getAddress(), n2, bluetoothGattDescriptor.getCharacteristic().getService().getUuid(), bluetoothGattDescriptor.getCharacteristic().getUuid(), bluetoothGattDescriptor.getUuid()));
        if (this.d != null && this.d instanceof com.inuker.bluetooth.library.connect.listener.k) {
            ((com.inuker.bluetooth.library.connect.listener.k)this.d).a(bluetoothGattDescriptor, n2);
        }
    }

    @Override
    public void b(int n2, int n3) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onReadRemoteRssi for %s, rssi = %d, status = %d", this.c.getAddress(), n2, n3));
        if (this.d != null && this.d instanceof g) {
            ((g)this.d).a(n2, n3);
        }
    }

    @Override
    public void c(int n2, int n3) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("onMtuChanged for %s, mtu = %d, status = %d", this.c.getAddress(), n2, n3));
        if (this.d != null && this.d instanceof h) {
            ((h)this.d).a(n2, n3);
        }
    }

    private void d(int n2) {
        Intent intent = new Intent("action.connect_status_changed");
        intent.putExtra("extra.mac", this.c.getAddress());
        intent.putExtra("extra.status", n2);
        com.inuker.bluetooth.library.e.b.a(intent);
    }

    private void c(UUID uUID, UUID uUID2, byte[] byArray) {
        Intent intent = new Intent("action.character_changed");
        intent.putExtra("extra.mac", this.c.getAddress());
        intent.putExtra("extra.service.uuid", (Serializable)uUID);
        intent.putExtra("extra.character.uuid", (Serializable)uUID2);
        intent.putExtra("extra.byte.value", byArray);
        com.inuker.bluetooth.library.e.b.a(intent);
    }

    @Override
    public boolean b() {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("openGatt for %s", this.j()));
        if (this.b != null) {
            com.inuker.bluetooth.library.e.a.b(String.format("Previous gatt not closed", new Object[0]));
            return true;
        }
        Context context = com.inuker.bluetooth.library.e.b.a();
        k k2 = new k(this.i);
        this.b = com.inuker.bluetooth.library.e.j.a() ? this.c.connectGatt(context, false, (BluetoothGattCallback)k2, 2) : this.c.connectGatt(context, false, (BluetoothGattCallback)k2);
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("openGatt failed: connectGatt return null!", new Object[0]));
            return false;
        }
        return true;
    }

    private String j() {
        return this.c.getAddress();
    }

    @Override
    public void c() {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("closeGatt for %s", this.j()));
        if (this.b != null) {
            this.b.close();
            this.b = null;
        }
        if (this.d != null) {
            this.d.a(false);
        }
        this.c(0);
        this.d(32);
    }

    @Override
    public boolean d() {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("discoverService for %s", this.j()));
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("discoverService but gatt is null!", new Object[0]));
            return false;
        }
        if (!this.b.discoverServices()) {
            com.inuker.bluetooth.library.e.a.b(String.format("discoverServices failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public int e() {
        this.a();
        return this.f;
    }

    @Override
    public void a(c c2) {
        this.a();
        this.d = c2;
    }

    @Override
    public void b(c c2) {
        this.a();
        if (this.d == c2) {
            this.d = null;
        }
    }

    @Override
    public boolean f() {
        com.inuker.bluetooth.library.e.a.c(String.format("refreshDeviceCache for %s", this.j()));
        this.a();
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        if (!com.inuker.bluetooth.library.e.b.a(this.b)) {
            com.inuker.bluetooth.library.e.a.b(String.format("refreshDeviceCache failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2) {
        com.inuker.bluetooth.library.e.a.c(String.format("readCharacteristic for %s: service = 0x%s, character = 0x%s", this.c.getAddress(), uUID, uUID2));
        this.a();
        BluetoothGattCharacteristic bluetoothGattCharacteristic = this.b(uUID, uUID2);
        if (bluetoothGattCharacteristic == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("characteristic not exist!", new Object[0]));
            return false;
        }
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        if (!this.b.readCharacteristic(bluetoothGattCharacteristic)) {
            com.inuker.bluetooth.library.e.a.b(String.format("readCharacteristic failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, byte[] byArray) {
        com.inuker.bluetooth.library.e.a.c(String.format("writeCharacteristic for %s: service = 0x%s, character = 0x%s, value = 0x%s", this.c.getAddress(), uUID, uUID2, com.inuker.bluetooth.library.e.c.b(byArray)));
        this.a();
        BluetoothGattCharacteristic bluetoothGattCharacteristic = this.b(uUID, uUID2);
        if (bluetoothGattCharacteristic == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("characteristic not exist!", new Object[0]));
            return false;
        }
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        bluetoothGattCharacteristic.setValue(byArray != null ? byArray : com.inuker.bluetooth.library.e.c.a);
        if (!this.b.writeCharacteristic(bluetoothGattCharacteristic)) {
            com.inuker.bluetooth.library.e.a.b(String.format("writeCharacteristic failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, UUID uUID3) {
        com.inuker.bluetooth.library.e.a.c(String.format("readDescriptor for %s: service = 0x%s, character = 0x%s, descriptor = 0x%s", this.c.getAddress(), uUID, uUID2, uUID3));
        this.a();
        BluetoothGattCharacteristic bluetoothGattCharacteristic = this.b(uUID, uUID2);
        if (bluetoothGattCharacteristic == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("characteristic not exist!", new Object[0]));
            return false;
        }
        BluetoothGattDescriptor bluetoothGattDescriptor = bluetoothGattCharacteristic.getDescriptor(uUID3);
        if (bluetoothGattDescriptor == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("descriptor not exist", new Object[0]));
            return false;
        }
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        if (!this.b.readDescriptor(bluetoothGattDescriptor)) {
            com.inuker.bluetooth.library.e.a.b(String.format("readDescriptor failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray) {
        com.inuker.bluetooth.library.e.a.c(String.format("writeDescriptor for %s: service = 0x%s, character = 0x%s, descriptor = 0x%s, value = 0x%s", this.c.getAddress(), uUID, uUID2, uUID3, com.inuker.bluetooth.library.e.c.b(byArray)));
        this.a();
        BluetoothGattCharacteristic bluetoothGattCharacteristic = this.b(uUID, uUID2);
        if (bluetoothGattCharacteristic == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("characteristic not exist!", new Object[0]));
            return false;
        }
        BluetoothGattDescriptor bluetoothGattDescriptor = bluetoothGattCharacteristic.getDescriptor(uUID3);
        if (bluetoothGattDescriptor == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("descriptor not exist", new Object[0]));
            return false;
        }
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        bluetoothGattDescriptor.setValue(byArray != null ? byArray : com.inuker.bluetooth.library.e.c.a);
        if (!this.b.writeDescriptor(bluetoothGattDescriptor)) {
            com.inuker.bluetooth.library.e.a.b(String.format("writeDescriptor failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean b(UUID uUID, UUID uUID2, byte[] byArray) {
        com.inuker.bluetooth.library.e.a.c(String.format("writeCharacteristicWithNoRsp for %s: service = 0x%s, character = 0x%s, value = 0x%s", this.c.getAddress(), uUID, uUID2, com.inuker.bluetooth.library.e.c.b(byArray)));
        this.a();
        BluetoothGattCharacteristic bluetoothGattCharacteristic = this.b(uUID, uUID2);
        if (bluetoothGattCharacteristic == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("characteristic not exist!", new Object[0]));
            return false;
        }
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        bluetoothGattCharacteristic.setValue(byArray != null ? byArray : com.inuker.bluetooth.library.e.c.a);
        bluetoothGattCharacteristic.setWriteType(1);
        if (!this.b.writeCharacteristic(bluetoothGattCharacteristic)) {
            com.inuker.bluetooth.library.e.a.b(String.format("writeCharacteristic failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, boolean bl) {
        byte[] byArray;
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("setCharacteristicNotification for %s, service = %s, character = %s, enable = %b", this.j(), uUID, uUID2, bl));
        BluetoothGattCharacteristic bluetoothGattCharacteristic = this.b(uUID, uUID2);
        if (bluetoothGattCharacteristic == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("characteristic not exist!", new Object[0]));
            return false;
        }
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        if (!this.b.setCharacteristicNotification(bluetoothGattCharacteristic, bl)) {
            com.inuker.bluetooth.library.e.a.b(String.format("setCharacteristicNotification failed", new Object[0]));
            return false;
        }
        BluetoothGattDescriptor bluetoothGattDescriptor = bluetoothGattCharacteristic.getDescriptor(com.inuker.bluetooth.library.i.L);
        if (bluetoothGattDescriptor == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("getDescriptor for notify null!", new Object[0]));
            return false;
        }
        byte[] byArray2 = byArray = bl ? BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE : BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE;
        if (!bluetoothGattDescriptor.setValue(byArray)) {
            com.inuker.bluetooth.library.e.a.b(String.format("setValue for notify descriptor failed!", new Object[0]));
            return false;
        }
        if (!this.b.writeDescriptor(bluetoothGattDescriptor)) {
            com.inuker.bluetooth.library.e.a.b(String.format("writeDescriptor for notify failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean b(UUID uUID, UUID uUID2, boolean bl) {
        byte[] byArray;
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("setCharacteristicIndication for %s, service = %s, character = %s, enable = %b", this.j(), uUID, uUID2, bl));
        BluetoothGattCharacteristic bluetoothGattCharacteristic = this.b(uUID, uUID2);
        if (bluetoothGattCharacteristic == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("characteristic not exist!", new Object[0]));
            return false;
        }
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        if (!this.b.setCharacteristicNotification(bluetoothGattCharacteristic, bl)) {
            com.inuker.bluetooth.library.e.a.b(String.format("setCharacteristicIndication failed", new Object[0]));
            return false;
        }
        BluetoothGattDescriptor bluetoothGattDescriptor = bluetoothGattCharacteristic.getDescriptor(com.inuker.bluetooth.library.i.L);
        if (bluetoothGattDescriptor == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("getDescriptor for indicate null!", new Object[0]));
            return false;
        }
        byte[] byArray2 = byArray = bl ? BluetoothGattDescriptor.ENABLE_INDICATION_VALUE : BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE;
        if (!bluetoothGattDescriptor.setValue(byArray)) {
            com.inuker.bluetooth.library.e.a.b(String.format("setValue for indicate descriptor failed!", new Object[0]));
            return false;
        }
        if (!this.b.writeDescriptor(bluetoothGattDescriptor)) {
            com.inuker.bluetooth.library.e.a.b(String.format("writeDescriptor for indicate failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public boolean g() {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("readRemoteRssi for %s", this.j()));
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        if (!this.b.readRemoteRssi()) {
            com.inuker.bluetooth.library.e.a.b(String.format("readRemoteRssi failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    @TargetApi(value=21)
    public boolean b(int n2) {
        this.a();
        com.inuker.bluetooth.library.e.a.c(String.format("requestMtu for %s, mtu = %d", this.j(), n2));
        if (this.b == null) {
            com.inuker.bluetooth.library.e.a.b(String.format("ble gatt null", new Object[0]));
            return false;
        }
        if (!this.b.requestMtu(n2)) {
            com.inuker.bluetooth.library.e.a.b(String.format("requestMtu failed", new Object[0]));
            return false;
        }
        return true;
    }

    @Override
    public com.inuker.bluetooth.library.c.c h() {
        return this.g;
    }

    private boolean a(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        return bluetoothGattCharacteristic != null && (bluetoothGattCharacteristic.getProperties() & 2) != 0;
    }

    private boolean b(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        return bluetoothGattCharacteristic != null && (bluetoothGattCharacteristic.getProperties() & 8) != 0;
    }

    private boolean c(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        return bluetoothGattCharacteristic != null && (bluetoothGattCharacteristic.getProperties() & 4) != 0;
    }

    private boolean d(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        return bluetoothGattCharacteristic != null && (bluetoothGattCharacteristic.getProperties() & 0x10) != 0;
    }

    private boolean e(BluetoothGattCharacteristic bluetoothGattCharacteristic) {
        return bluetoothGattCharacteristic != null && (bluetoothGattCharacteristic.getProperties() & 0x20) != 0;
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 288: {
                com.inuker.bluetooth.library.e.b.a.a(message.obj);
            }
        }
        return true;
    }

    @Override
    public boolean a(Object object, Method method, Object[] objectArray) {
        this.e.obtainMessage(288, (Object)new a(object, method, objectArray)).sendToTarget();
        return true;
    }

    @Override
    public void a() {
        this.j.a();
    }
}

