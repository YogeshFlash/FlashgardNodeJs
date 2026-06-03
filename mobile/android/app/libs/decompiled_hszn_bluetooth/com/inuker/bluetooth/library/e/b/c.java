/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 */
package com.inuker.bluetooth.library.e.b;

import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import com.inuker.bluetooth.library.e.b.a;
import com.inuker.bluetooth.library.e.b.b;
import java.lang.ref.WeakReference;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

public class c
implements Handler.Callback,
b,
InvocationHandler {
    private Object a;
    private b b;
    private boolean c;
    private boolean d;
    private Handler e;

    public c(Object object) {
        this(object, null);
    }

    public c(Object object, b b2) {
        this(object, b2, false);
    }

    public c(Object object, b b2, boolean bl) {
        this(object, b2, bl, false);
    }

    public c(Object object, b b2, boolean bl, boolean bl2) {
        this.c = bl;
        this.b = b2;
        this.d = bl2;
        this.a = this.a(object);
        this.e = new Handler(Looper.getMainLooper(), (Handler.Callback)this);
    }

    @Override
    public Object invoke(Object object, Method method, Object[] objectArray) throws Throwable {
        Object object2 = this.a();
        if (!this.a(object2, method, objectArray)) {
            a a2 = new a(object2, method, objectArray);
            return this.d ? this.a(a2) : this.b(a2);
        }
        return null;
    }

    @Override
    public boolean a(Object object, Method method, Object[] objectArray) {
        if (this.b != null) {
            try {
                return this.b.a(object, method, objectArray);
            }
            catch (Exception exception) {
                com.inuker.bluetooth.library.e.a.a(exception);
            }
        }
        return false;
    }

    private Object a(Object object) {
        return this.c ? new WeakReference<Object>(object) : object;
    }

    private Object a() {
        if (this.c) {
            return ((WeakReference)this.a).get();
        }
        return this.a;
    }

    private Object a(a a2) {
        this.e.obtainMessage(0, (Object)a2).sendToTarget();
        return null;
    }

    private Object b(a a2) {
        try {
            return a2.a();
        }
        catch (Throwable throwable) {
            return null;
        }
    }

    public boolean handleMessage(Message message) {
        com.inuker.bluetooth.library.e.b.a.a(message.obj);
        return true;
    }
}

