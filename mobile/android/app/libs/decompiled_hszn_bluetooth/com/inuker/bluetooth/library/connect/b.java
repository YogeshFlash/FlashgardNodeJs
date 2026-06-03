/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.HandlerThread
 *  android.os.Looper
 */
package com.inuker.bluetooth.library.connect;

import android.os.HandlerThread;
import android.os.Looper;
import com.inuker.bluetooth.library.connect.a.a;
import com.inuker.bluetooth.library.connect.c;
import com.inuker.bluetooth.library.connect.f;
import java.util.HashMap;
import java.util.UUID;

public class b {
    private static final String a = b.class.getSimpleName();
    private static HashMap<String, f> b = new HashMap();
    private static HandlerThread c;

    private static Looper a() {
        if (c == null) {
            c = new HandlerThread(a);
            c.start();
        }
        return c.getLooper();
    }

    private static f c(String string) {
        f f2 = b.get(string);
        if (f2 == null) {
            f2 = com.inuker.bluetooth.library.connect.c.a(string, com.inuker.bluetooth.library.connect.b.a());
            b.put(string, f2);
        }
        return f2;
    }

    public static void a(String string, a a2, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(a2, b2);
    }

    public static void a(String string) {
        com.inuker.bluetooth.library.connect.b.c(string).a();
    }

    public static void a(String string, UUID uUID, UUID uUID2, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(uUID, uUID2, b2);
    }

    public static void a(String string, UUID uUID, UUID uUID2, byte[] byArray, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(uUID, uUID2, byArray, b2);
    }

    public static void b(String string, UUID uUID, UUID uUID2, byte[] byArray, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).b(uUID, uUID2, byArray, b2);
    }

    public static void a(String string, UUID uUID, UUID uUID2, UUID uUID3, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(uUID, uUID2, uUID3, b2);
    }

    public static void a(String string, UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(uUID, uUID2, uUID3, byArray, b2);
    }

    public static void b(String string, UUID uUID, UUID uUID2, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).b(uUID, uUID2, b2);
    }

    public static void c(String string, UUID uUID, UUID uUID2, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).c(uUID, uUID2, b2);
    }

    public static void a(String string, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(b2);
    }

    public static void d(String string, UUID uUID, UUID uUID2, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).d(uUID, uUID2, b2);
    }

    public static void a(String string, int n2, com.inuker.bluetooth.library.connect.c.b b2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(n2, b2);
    }

    public static void a(String string, int n2) {
        com.inuker.bluetooth.library.connect.b.c(string).a(n2);
    }

    public static void b(String string) {
        com.inuker.bluetooth.library.connect.b.c(string).b();
    }
}

