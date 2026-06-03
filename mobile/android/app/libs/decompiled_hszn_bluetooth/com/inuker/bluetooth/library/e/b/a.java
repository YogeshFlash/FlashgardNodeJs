/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.b;

import java.lang.reflect.Method;

public class a {
    public Object a;
    public Method b;
    public Object[] c;

    public a(Object object, Method method, Object[] objectArray) {
        this.a = object;
        this.b = method;
        this.c = objectArray;
    }

    public Object a() {
        Object object = null;
        try {
            object = this.b.invoke(this.a, this.c);
        }
        catch (Throwable throwable) {
            com.inuker.bluetooth.library.e.a.a(throwable);
        }
        return object;
    }

    public static Object a(Object object) {
        return ((a)object).a();
    }
}

