/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.IBinder
 */
package com.inuker.bluetooth.library.e.a.a;

import android.os.IBinder;
import com.inuker.bluetooth.library.e.a.b.b;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;

public class a {
    private static Class<?> a = com.inuker.bluetooth.library.e.a.b.b.a("android.os.ServiceManager");
    private static Field b = com.inuker.bluetooth.library.e.a.b.b.a(a, "sCache");
    private static Method c;

    public static Class<?> a() {
        return a;
    }

    public static Field b() {
        return b;
    }

    public static HashMap<String, IBinder> c() {
        return (HashMap)com.inuker.bluetooth.library.e.a.b.b.a(b);
    }

    public static Method d() {
        return c;
    }

    static {
        b.setAccessible(true);
        c = com.inuker.bluetooth.library.e.a.b.b.a(a, "getService", String.class);
    }
}

