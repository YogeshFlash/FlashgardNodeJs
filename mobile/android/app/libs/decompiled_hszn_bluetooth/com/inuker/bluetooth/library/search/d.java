/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 */
package com.inuker.bluetooth.library.search;

import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import com.inuker.bluetooth.library.search.c.a;
import com.inuker.bluetooth.library.search.e;
import com.inuker.bluetooth.library.search.h;

public class d
implements Handler.Callback {
    private static final int a = 34;
    private int b;
    private int c;
    private e d;
    private Handler e;

    public d(h h2) {
        this.a(h2.a());
        this.b(h2.b());
        this.e = new Handler(Looper.myLooper(), (Handler.Callback)this);
    }

    public void a(int n2) {
        this.b = n2;
    }

    public void b(int n2) {
        this.c = n2;
    }

    public boolean a() {
        return this.b == 2;
    }

    public boolean b() {
        return this.b == 1;
    }

    private e d() {
        if (this.d == null) {
            this.d = com.inuker.bluetooth.library.search.e.a(this.b);
        }
        return this.d;
    }

    public void a(a a2) {
        this.d().a(a2);
        this.e.sendEmptyMessageDelayed(34, (long)this.c);
    }

    public void c() {
        this.e.removeCallbacksAndMessages(null);
        this.d().b();
    }

    public String toString() {
        String string = "";
        string = this.a() ? "Ble" : (this.b() ? "classic" : "unknown");
        if (this.c >= 1000) {
            return String.format("%s search (%ds)", string, this.c / 1000);
        }
        return String.format("%s search (%.1fs)", string, 1.0 * (double)this.c / 1000.0);
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 34: {
                this.d().a();
            }
        }
        return true;
    }
}

