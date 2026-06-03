/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.IBinder
 *  android.os.IInterface
 */
package com.inuker.bluetooth.library.e.a;

import android.os.IBinder;
import android.os.IInterface;
import com.inuker.bluetooth.library.e.a;
import com.inuker.bluetooth.library.e.a.b.b;
import com.inuker.bluetooth.library.e.a.d;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class c
implements InvocationHandler {
    private IBinder a;
    private Class<?> b;
    private Object c;

    c(IBinder iBinder) {
        this.a = iBinder;
        this.b = com.inuker.bluetooth.library.e.a.b.b.a("android.bluetooth.IBluetoothManager");
        Class<?> clazz = com.inuker.bluetooth.library.e.a.b.b.a("android.bluetooth.IBluetoothManager$Stub");
        Method method = com.inuker.bluetooth.library.e.a.b.b.a(clazz, "asInterface", IBinder.class);
        this.c = com.inuker.bluetooth.library.e.a.b.b.a(method, null, iBinder);
    }

    @Override
    public Object invoke(Object object, Method method, Object[] objectArray) throws Throwable {
        com.inuker.bluetooth.library.e.a.c(String.format("IBinder method: %s", method.getName()));
        if ("queryLocalInterface".equals(method.getName())) {
            return Proxy.newProxyInstance(object.getClass().getClassLoader(), new Class[]{IBinder.class, IInterface.class, this.b}, (InvocationHandler)new d(this.c));
        }
        return method.invoke(this.a, objectArray);
    }
}

