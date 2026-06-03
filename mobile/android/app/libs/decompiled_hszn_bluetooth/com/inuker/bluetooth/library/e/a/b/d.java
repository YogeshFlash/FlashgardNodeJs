/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.a.b;

import com.inuker.bluetooth.library.e.a.b.c;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

public class d {
    public static Method a(Class<?> clazz, String string, Class<?> ... classArray) {
        try {
            return d.a(clazz.getMethod(string, classArray));
        }
        catch (NoSuchMethodException noSuchMethodException) {
            return null;
        }
    }

    public static Method a(Method method) {
        Class<?>[] classArray;
        if (!c.a(method)) {
            return null;
        }
        Class<?> clazz = method.getDeclaringClass();
        if (Modifier.isPublic(clazz.getModifiers())) {
            return method;
        }
        String string = method.getName();
        if ((method = d.c(clazz, string, classArray = method.getParameterTypes())) == null) {
            method = d.b(clazz, string, classArray);
        }
        return method;
    }

    private static Method b(Class<?> clazz, String string, Class<?> ... classArray) {
        for (Class<?> clazz2 = clazz.getSuperclass(); clazz2 != null; clazz2 = clazz2.getSuperclass()) {
            if (!Modifier.isPublic(clazz2.getModifiers())) continue;
            try {
                return clazz2.getMethod(string, classArray);
            }
            catch (NoSuchMethodException noSuchMethodException) {
                return null;
            }
        }
        return null;
    }

    private static Method c(Class<?> clazz, String string, Class<?> ... classArray) {
        while (clazz != null) {
            Class<?>[] classArray2 = clazz.getInterfaces();
            for (int i2 = 0; i2 < classArray2.length; ++i2) {
                if (!Modifier.isPublic(classArray2[i2].getModifiers())) continue;
                try {
                    return classArray2[i2].getDeclaredMethod(string, classArray);
                }
                catch (NoSuchMethodException noSuchMethodException) {
                    Method method = d.c(classArray2[i2], string, classArray);
                    if (method == null) continue;
                    return method;
                }
            }
            clazz = clazz.getSuperclass();
        }
        return null;
    }
}

