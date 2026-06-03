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
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

public class d
implements InvocationHandler {
    private Object a;
    private Class<?> b;
    private Object c;

    d(Object object) {
        this.a = object;
        this.b = com.inuker.bluetooth.library.e.a.b.b.a("android.bluetooth.IBluetoothGatt");
        Class<?> clazz = com.inuker.bluetooth.library.e.a.b.b.a("android.bluetooth.IBluetoothManager");
        Method method = com.inuker.bluetooth.library.e.a.b.b.a(clazz, "getBluetoothGatt", new Class[0]);
        this.c = com.inuker.bluetooth.library.e.a.b.b.a(method, object, new Object[0]);
    }

    @Override
    public Object invoke(Object object, Method method, Object[] objectArray) throws Throwable {
        com.inuker.bluetooth.library.e.a.c(String.format("IBluetoothManager method: %s", method.getName()));
        if ("getBluetoothGatt".equals(method.getName())) {
            return Proxy.newProxyInstance(object.getClass().getClassLoader(), new Class[]{IBinder.class, IInterface.class, this.b}, (InvocationHandler)new com.inuker.bluetooth.library.e.a.a(this.c));
        }
        return method.invoke(this.a, objectArray);
    }
}

