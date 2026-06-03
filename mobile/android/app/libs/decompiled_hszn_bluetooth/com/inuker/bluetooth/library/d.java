/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.Context
 *  android.os.Handler
 *  android.os.Looper
 */
package com.inuker.bluetooth.library;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;

public class d {
    private static Context a;
    private static Handler b;

    public static void a(Context context) {
        a = context;
    }

    public static Context a() {
        return a;
    }

    public static void a(Runnable runnable) {
        d.a(runnable, 0L);
    }

    public static void a(Runnable runnable, long l2) {
        if (b == null) {
            b = new Handler(Looper.getMainLooper());
        }
        b.postDelayed(runnable, l2);
    }

    public static String b() {
        StackTraceElement stackTraceElement = Thread.currentThread().getStackTrace()[4];
        return stackTraceElement.getMethodName();
    }
}

