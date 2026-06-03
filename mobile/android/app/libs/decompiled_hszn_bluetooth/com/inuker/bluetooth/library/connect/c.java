/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 */
package com.inuker.bluetooth.library.connect;

import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import com.inuker.bluetooth.library.connect.a.a;
import com.inuker.bluetooth.library.connect.c.b;
import com.inuker.bluetooth.library.connect.f;
import com.inuker.bluetooth.library.e.b.d;
import java.lang.reflect.Method;
import java.util.UUID;

public class c
implements Handler.Callback,
f,
com.inuker.bluetooth.library.e.b.b {
    private Handler a;
    private String b;
    private com.inuker.bluetooth.library.connect.a c;

    private c(String string, Looper looper) {
        this.b = string;
        this.a = new Handler(looper, (Handler.Callback)this);
    }

    private com.inuker.bluetooth.library.connect.a c() {
        if (this.c == null) {
            this.c = com.inuker.bluetooth.library.connect.a.a(this.b);
        }
        return this.c;
    }

    static f a(String string, Looper looper) {
        c c2 = new c(string, looper);
        return (f)d.a((Object)c2, f.class, (com.inuker.bluetooth.library.e.b.b)c2);
    }

    @Override
    public void a(a a2, b b2) {
        this.c().a(a2, b2);
    }

    @Override
    public void a() {
        this.c().b();
    }

    @Override
    public void a(UUID uUID, UUID uUID2, b b2) {
        this.c().a(uUID, uUID2, b2);
    }

    @Override
    public void a(UUID uUID, UUID uUID2, byte[] byArray, b b2) {
        this.c().a(uUID, uUID2, byArray, b2);
    }

    @Override
    public void b(UUID uUID, UUID uUID2, byte[] byArray, b b2) {
        this.c().b(uUID, uUID2, byArray, b2);
    }

    @Override
    public void a(UUID uUID, UUID uUID2, UUID uUID3, b b2) {
        this.c().a(uUID, uUID2, uUID3, b2);
    }

    @Override
    public void a(UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray, b b2) {
        this.c().a(uUID, uUID2, uUID3, byArray, b2);
    }

    @Override
    public void b(UUID uUID, UUID uUID2, b b2) {
        this.c().b(uUID, uUID2, b2);
    }

    @Override
    public void c(UUID uUID, UUID uUID2, b b2) {
        this.c().c(uUID, uUID2, b2);
    }

    @Override
    public void a(b b2) {
        this.c().a(b2);
    }

    @Override
    public void d(UUID uUID, UUID uUID2, b b2) {
        this.c().d(uUID, uUID2, b2);
    }

    @Override
    public void a(int n2, b b2) {
        this.c().a(n2, b2);
    }

    @Override
    public void a(int n2) {
        this.c().a(n2);
    }

    @Override
    public void b() {
        this.c().c();
    }

    @Override
    public boolean a(Object object, Method method, Object[] objectArray) {
        this.a.obtainMessage(0, (Object)new com.inuker.bluetooth.library.e.b.a(object, method, objectArray)).sendToTarget();
        return true;
    }

    public boolean handleMessage(Message message) {
        com.inuker.bluetooth.library.e.b.a.a(message.obj);
        return true;
    }
}

