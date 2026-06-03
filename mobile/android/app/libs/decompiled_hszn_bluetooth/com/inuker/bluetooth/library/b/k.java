/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.Looper
 */
package com.inuker.bluetooth.library.b;

import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.TimeoutException;

public class k {
    private static Handler a = new Handler(Looper.getMainLooper());
    private static a b;

    public static synchronized void a() {
        a.removeCallbacksAndMessages(null);
        b = null;
    }

    public static synchronized boolean b() {
        return b != null;
    }

    public static synchronized String c() {
        return k.b() ? b.b() : "";
    }

    public static synchronized void a(a a2, long l2) {
        a.removeCallbacksAndMessages(null);
        Looper looper = Looper.myLooper();
        if (looper == null) {
            looper = Looper.getMainLooper();
        }
        a = new Handler(looper);
        a.postDelayed((Runnable)a2, l2);
        b = a2;
    }

    public static abstract class a
    implements Runnable {
        private String a;

        public a(String string) {
            this.a = string;
        }

        public String b() {
            return this.a;
        }

        @Override
        public final void run() {
            com.inuker.bluetooth.library.e.a.b(String.format("%s: Timer expired!!!", this.a));
            try {
                this.a();
            }
            catch (TimeoutException timeoutException) {
                com.inuker.bluetooth.library.e.a.a(timeoutException);
            }
            b = null;
        }

        public abstract void a() throws TimeoutException;
    }
}

