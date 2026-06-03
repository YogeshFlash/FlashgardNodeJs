/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.a.b;

import com.inuker.bluetooth.library.e.a.b.a;
import com.inuker.bluetooth.library.e.a.b.d;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

public class b {
    public static Class<?> a(String string) {
        try {
            return Class.forName(string);
        }
        catch (ClassNotFoundException classNotFoundException) {
            classNotFoundException.printStackTrace();
            return null;
        }
    }

    public static Method a(Class<?> clazz, String string, Class<?> ... classArray) {
        return d.a(clazz, string, classArray);
    }

    public static Field a(Class<?> clazz, String string) {
        if (clazz != null) {
            return a.a(clazz, string, true);
        }
        return null;
    }

    public static <T> T a(Field field) {
        return b.a(field, null);
    }

    public static <T> T a(Field field, Object object) {
        try {
            if (field != null) {
                return (T)field.get(object);
            }
        }
        catch (IllegalAccessException illegalAccessException) {
            illegalAccessException.printStackTrace();
        }
        return null;
    }

    public static <T> T a(Method method, Object object, Object ... objectArray) {
        try {
            return (T)method.invoke(object, objectArray);
        }
        catch (IllegalAccessException illegalAccessException) {
            illegalAccessException.printStackTrace();
        }
        catch (InvocationTargetException invocationTargetException) {
            invocationTargetException.printStackTrace();
        }
        return null;
    }
}

