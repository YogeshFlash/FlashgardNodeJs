/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.a;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

public class a
implements InvocationHandler {
    private Object a;

    a(Object object) {
        this.a = object;
    }

    @Override
    public Object invoke(Object object, Method method, Object[] objectArray) throws Throwable {
        com.inuker.bluetooth.library.e.a.c(String.format("IBluetoothGatt method: %s", method.getName()));
        return method.invoke(this.a, objectArray);
    }
}

