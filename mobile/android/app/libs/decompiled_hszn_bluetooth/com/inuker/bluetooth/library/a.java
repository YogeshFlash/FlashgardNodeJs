/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.Context
 */
package com.inuker.bluetooth.library;

import android.content.Context;
import com.inuker.bluetooth.library.connect.c.c;
import com.inuker.bluetooth.library.connect.c.e;
import com.inuker.bluetooth.library.connect.c.f;
import com.inuker.bluetooth.library.connect.c.i;
import com.inuker.bluetooth.library.connect.c.j;
import com.inuker.bluetooth.library.connect.listener.BluetoothStateListener;
import com.inuker.bluetooth.library.d.a.d;
import com.inuker.bluetooth.library.e.b;
import com.inuker.bluetooth.library.search.g;
import java.util.UUID;

public class a
implements com.inuker.bluetooth.library.j {
    private com.inuker.bluetooth.library.j a;

    public a(Context context) {
        if (context == null) {
            throw new NullPointerException("Context null");
        }
        this.a = com.inuker.bluetooth.library.b.a(context);
    }

    public void a(String string, com.inuker.bluetooth.library.connect.c.a a2) {
        this.a(string, null, a2);
    }

    @Override
    public void a(String string, com.inuker.bluetooth.library.connect.a.a a2, com.inuker.bluetooth.library.connect.c.a a3) {
        com.inuker.bluetooth.library.e.a.c(String.format("connect %s", string));
        a3 = (com.inuker.bluetooth.library.connect.c.a)com.inuker.bluetooth.library.e.b.d.a(a3);
        this.a.a(string, a2, a3);
    }

    @Override
    public void a(String string) {
        com.inuker.bluetooth.library.e.a.c(String.format("disconnect %s", string));
        this.a.a(string);
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, e e2) {
        com.inuker.bluetooth.library.e.a.c(String.format("read character for %s: service = %s, character = %s", string, uUID, uUID2));
        e2 = (e)com.inuker.bluetooth.library.e.b.d.a(e2);
        this.a.a(string, uUID, uUID2, e2);
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, byte[] byArray, j j2) {
        com.inuker.bluetooth.library.e.a.c(String.format("write character for %s: service = %s, character = %s, value = %s", string, uUID, uUID2, com.inuker.bluetooth.library.e.c.b(byArray)));
        j2 = (j)com.inuker.bluetooth.library.e.b.d.a(j2);
        this.a.a(string, uUID, uUID2, byArray, j2);
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, UUID uUID3, e e2) {
        com.inuker.bluetooth.library.e.a.c(String.format("readDescriptor for %s: service = %s, character = %s", string, uUID, uUID2));
        e2 = (e)com.inuker.bluetooth.library.e.b.d.a(e2);
        this.a.a(string, uUID, uUID2, uUID3, e2);
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray, j j2) {
        com.inuker.bluetooth.library.e.a.c(String.format("writeDescriptor for %s: service = %s, character = %s", string, uUID, uUID2));
        j2 = (j)com.inuker.bluetooth.library.e.b.d.a(j2);
        this.a.a(string, uUID, uUID2, uUID3, byArray, j2);
    }

    @Override
    public void b(String string, UUID uUID, UUID uUID2, byte[] byArray, j j2) {
        com.inuker.bluetooth.library.e.a.c(String.format("writeNoRsp %s: service = %s, character = %s, value = %s", string, uUID, uUID2, com.inuker.bluetooth.library.e.c.b(byArray)));
        j2 = (j)com.inuker.bluetooth.library.e.b.d.a(j2);
        this.a.b(string, uUID, uUID2, byArray, j2);
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, com.inuker.bluetooth.library.connect.c.d d2) {
        com.inuker.bluetooth.library.e.a.c(String.format("notify %s: service = %s, character = %s", string, uUID, uUID2));
        d2 = (com.inuker.bluetooth.library.connect.c.d)com.inuker.bluetooth.library.e.b.d.a(d2);
        this.a.a(string, uUID, uUID2, d2);
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, i i2) {
        com.inuker.bluetooth.library.e.a.c(String.format("unnotify %s: service = %s, character = %s", string, uUID, uUID2));
        i2 = (i)com.inuker.bluetooth.library.e.b.d.a(i2);
        this.a.a(string, uUID, uUID2, i2);
    }

    @Override
    public void b(String string, UUID uUID, UUID uUID2, com.inuker.bluetooth.library.connect.c.d d2) {
        com.inuker.bluetooth.library.e.a.c(String.format("indicate %s: service = %s, character = %s", string, uUID, uUID2));
        d2 = (com.inuker.bluetooth.library.connect.c.d)com.inuker.bluetooth.library.e.b.d.a(d2);
        this.a.b(string, uUID, uUID2, d2);
    }

    @Override
    public void b(String string, UUID uUID, UUID uUID2, i i2) {
        com.inuker.bluetooth.library.e.a.c(String.format("indicate %s: service = %s, character = %s", string, uUID, uUID2));
        i2 = (i)com.inuker.bluetooth.library.e.b.d.a(i2);
        this.a.b(string, uUID, uUID2, i2);
    }

    @Override
    public void a(String string, f f2) {
        com.inuker.bluetooth.library.e.a.c(String.format("readRssi %s", string));
        f2 = (f)com.inuker.bluetooth.library.e.b.d.a(f2);
        this.a.a(string, f2);
    }

    @Override
    public void a(String string, int n2, c c2) {
        com.inuker.bluetooth.library.e.a.c(String.format("requestMtu %s", string));
        c2 = (c)com.inuker.bluetooth.library.e.b.d.a(c2);
        this.a.a(string, n2, c2);
    }

    @Override
    public void a(g g2, com.inuker.bluetooth.library.search.c.b b2) {
        com.inuker.bluetooth.library.e.a.c(String.format("search %s", g2));
        b2 = (com.inuker.bluetooth.library.search.c.b)com.inuker.bluetooth.library.e.b.d.a(b2);
        this.a.a(g2, b2);
    }

    @Override
    public void a() {
        com.inuker.bluetooth.library.e.a.c(String.format("stopSearch", new Object[0]));
        this.a.a();
    }

    @Override
    public void a(String string, com.inuker.bluetooth.library.connect.listener.a a2) {
        this.a.a(string, a2);
    }

    @Override
    public void b(String string, com.inuker.bluetooth.library.connect.listener.a a2) {
        this.a.b(string, a2);
    }

    @Override
    public void a(BluetoothStateListener bluetoothStateListener) {
        this.a.a(bluetoothStateListener);
    }

    @Override
    public void b(BluetoothStateListener bluetoothStateListener) {
        this.a.b(bluetoothStateListener);
    }

    @Override
    public void a(d d2) {
        this.a.a(d2);
    }

    @Override
    public void b(d d2) {
        this.a.b(d2);
    }

    public int b(String string) {
        return b.c(string);
    }

    public boolean b() {
        return b.c();
    }

    public boolean c() {
        return b.e();
    }

    public boolean d() {
        return b.f();
    }

    public boolean e() {
        return b.b();
    }

    public int c(String string) {
        return b.d(string);
    }

    @Override
    public void a(String string, int n2) {
        this.a.a(string, n2);
    }

    @Override
    public void d(String string) {
        this.a.d(string);
    }
}

