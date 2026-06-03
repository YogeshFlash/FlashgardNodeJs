/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.util.Log
 */
package com.inuker.bluetooth.library.e;

import android.util.Log;
import java.io.PrintWriter;
import java.io.StringWriter;

public class a {
    private static final String a = "miio-bluetooth";

    public static void a(String string) {
        Log.i((String)a, (String)string);
    }

    public static void b(String string) {
        Log.e((String)a, (String)string);
    }

    public static void c(String string) {
        Log.v((String)a, (String)string);
    }

    public static void d(String string) {
        Log.d((String)a, (String)string);
    }

    public static void e(String string) {
        Log.w((String)a, (String)string);
    }

    public static void a(Throwable throwable) {
        com.inuker.bluetooth.library.e.a.b(com.inuker.bluetooth.library.e.a.c(throwable));
    }

    public static void b(Throwable throwable) {
        com.inuker.bluetooth.library.e.a.e(com.inuker.bluetooth.library.e.a.c(throwable));
    }

    private static String c(Throwable throwable) {
        StringWriter stringWriter = new StringWriter();
        PrintWriter printWriter = new PrintWriter(stringWriter);
        while (throwable != null) {
            throwable.printStackTrace(printWriter);
            throwable = throwable.getCause();
        }
        String string = ((Object)stringWriter).toString();
        printWriter.close();
        return string;
    }
}

