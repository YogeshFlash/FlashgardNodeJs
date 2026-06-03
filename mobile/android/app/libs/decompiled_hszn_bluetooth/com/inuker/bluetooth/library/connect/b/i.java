/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Bundle
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 *  android.os.Parcelable
 */
package com.inuker.bluetooth.library.connect.b;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.Parcelable;
import com.inuker.bluetooth.library.c.c;
import com.inuker.bluetooth.library.connect.b.n;
import com.inuker.bluetooth.library.connect.c.b;
import com.inuker.bluetooth.library.connect.e;
import com.inuker.bluetooth.library.connect.g;
import com.inuker.bluetooth.library.e.a;
import com.inuker.bluetooth.library.m;
import java.util.UUID;

public abstract class i
implements Handler.Callback,
n,
g,
com.inuker.bluetooth.library.connect.listener.c,
m {
    protected static final int g = 32;
    protected b h;
    protected Bundle i;
    protected String j;
    protected e k;
    protected g l;
    protected Handler m;
    protected Handler n;
    private m p;
    private boolean q;
    protected boolean o;

    public i(b b2) {
        this.h = b2;
        this.i = new Bundle();
        this.m = new Handler(Looper.myLooper(), (Handler.Callback)this);
        this.n = new Handler(Looper.getMainLooper());
    }

    public String j() {
        return this.j;
    }

    public void a(String string) {
        this.j = string;
    }

    public void a(g g2) {
        this.l = g2;
    }

    public void a(final int n2) {
        if (this.q) {
            return;
        }
        this.q = true;
        this.n.post(new Runnable(){

            @Override
            public void run() {
                try {
                    if (i.this.h != null) {
                        i.this.h.a(n2, i.this.i);
                    }
                }
                catch (Throwable throwable) {
                    throwable.printStackTrace();
                }
            }
        });
    }

    public String toString() {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(this.getClass().getSimpleName());
        return stringBuilder.toString();
    }

    public void a(String string, int n2) {
        this.i.putInt(string, n2);
    }

    public int b(String string, int n2) {
        return this.i.getInt(string, n2);
    }

    public void a(String string, byte[] byArray) {
        this.i.putByteArray(string, byArray);
    }

    public void a(String string, Parcelable parcelable) {
        this.i.putParcelable(string, parcelable);
    }

    public Bundle k() {
        return this.i;
    }

    protected String l() {
        return com.inuker.bluetooth.library.i.a(this.e());
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, UUID uUID3) {
        return this.l.a(uUID, uUID2, uUID3);
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray) {
        return this.l.a(uUID, uUID2, uUID3, byArray);
    }

    public abstract void i();

    @Override
    public boolean b() {
        return this.l.b();
    }

    @Override
    public boolean d() {
        return this.l.d();
    }

    @Override
    public int e() {
        return this.l.e();
    }

    @Override
    public final void a(e e2) {
        this.a();
        this.k = e2;
        a.e(String.format("Process %s, status = %s", this.getClass().getSimpleName(), this.l()));
        if (!com.inuker.bluetooth.library.e.b.b()) {
            this.c(-4);
        } else if (!com.inuker.bluetooth.library.e.b.c()) {
            this.c(-5);
        } else {
            try {
                this.a(this);
                this.i();
            }
            catch (Throwable throwable) {
                a.a(throwable);
                this.c(-10);
            }
        }
    }

    protected void c(int n2) {
        this.a();
        this.b(String.format("request complete: code = %d", n2));
        this.m.removeCallbacksAndMessages(null);
        this.b(this);
        this.a(n2);
        this.k.a(this);
    }

    @Override
    public void c() {
        this.b(String.format("close gatt", new Object[0]));
        this.l.c();
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 32: {
                this.o = true;
                this.c();
            }
        }
        return true;
    }

    @Override
    public void a(com.inuker.bluetooth.library.connect.listener.c c2) {
        this.l.a(c2);
    }

    @Override
    public void b(com.inuker.bluetooth.library.connect.listener.c c2) {
        this.l.b(c2);
    }

    @Override
    public boolean f() {
        return this.l.f();
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2) {
        return this.l.a(uUID, uUID2);
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, byte[] byArray) {
        return this.l.a(uUID, uUID2, byArray);
    }

    @Override
    public boolean b(UUID uUID, UUID uUID2, byte[] byArray) {
        return this.l.b(uUID, uUID2, byArray);
    }

    @Override
    public boolean a(UUID uUID, UUID uUID2, boolean bl) {
        return this.l.a(uUID, uUID2, bl);
    }

    @Override
    public boolean b(UUID uUID, UUID uUID2, boolean bl) {
        return this.l.b(uUID, uUID2, bl);
    }

    @Override
    public boolean g() {
        return this.l.g();
    }

    @Override
    public boolean b(int n2) {
        return this.l.b(n2);
    }

    protected void b(String string) {
        a.c(String.format("%s %s >>> %s", this.getClass().getSimpleName(), this.j(), string));
    }

    public void a(m m2) {
        this.p = m2;
    }

    @Override
    public void a() {
        this.p.a();
    }

    @Override
    public void m() {
        this.a();
        this.b(String.format("request canceled", new Object[0]));
        this.m.removeCallbacksAndMessages(null);
        this.b(this);
        this.a(-2);
    }

    protected long n() {
        return 30000L;
    }

    @Override
    public void a(boolean bl) {
        if (!bl) {
            this.c(this.o ? -7 : -1);
        }
    }

    protected void o() {
        this.m.sendEmptyMessageDelayed(32, this.n());
    }

    protected void p() {
        this.m.removeMessages(32);
    }

    @Override
    public c h() {
        return this.l.h();
    }
}

