/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.a.b;

import com.inuker.bluetooth.library.e.a.b.c;
import com.inuker.bluetooth.library.e.a.b.e;
import com.inuker.bluetooth.library.e.g;
import java.lang.reflect.Field;

public class a {
    public static Field a(Class<?> clazz, String string, boolean bl) {
        e.a(clazz != null, "The class must not be null", new Object[0]);
        e.a(g.a(string), "The field name must not be blank/empty", new Object[0]);
        try {
            Field field = clazz.getDeclaredField(string);
            if (!c.a(field)) {
                if (bl) {
                    field.setAccessible(true);
                } else {
                    return null;
                }
            }
            return field;
        }
        catch (NoSuchFieldException noSuchFieldException) {
            return null;
        }
    }
}

