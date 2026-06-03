/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.b;

import com.inuker.bluetooth.library.e.b.b;
import com.inuker.bluetooth.library.e.b.c;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;

public class d {
    public static <T> T a(Object object, Class<?>[] classArray, b b2, boolean bl, boolean bl2) {
        return (T)Proxy.newProxyInstance(object.getClass().getClassLoader(), classArray, (InvocationHandler)new c(object, b2, bl, bl2));
    }

    public static <T> T a(Object object, Class<?> clazz, b b2, boolean bl, boolean bl2) {
        return d.a(object, new Class[]{clazz}, b2, bl, bl2);
    }

    public static <T> T a(Object object, Class<?> clazz, b b2) {
        return d.a(object, clazz, b2, false, false);
    }

    public static <T> T a(Object object, b b2) {
        return d.a(object, object.getClass().getInterfaces(), b2);
    }

    public static <T> T a(Object object, Class<?> clazz) {
        return d.a(object, clazz, null, true, true);
    }

    public static <T> T a(Object object) {
        return d.a(object, object.getClass().getInterfaces(), null);
    }

    public static <T> T b(Object object, Class<?> clazz) {
        return d.a(object, new Class[]{clazz}, null);
    }

    public static <T> T b(Object object, Class<?> clazz, b b2) {
        return d.a(object, new Class[]{clazz}, b2);
    }

    public static <T> T a(Object object, Class<?>[] classArray, b b2) {
        return d.a(object, classArray, b2, false, true);
    }
}

