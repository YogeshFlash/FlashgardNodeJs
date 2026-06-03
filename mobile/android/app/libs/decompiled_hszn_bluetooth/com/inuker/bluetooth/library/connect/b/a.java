/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Message
 *  android.os.Parcelable
 */
package com.inuker.bluetooth.library.connect.b;

import android.os.Message;
import android.os.Parcelable;
import com.inuker.bluetooth.library.c.c;
import com.inuker.bluetooth.library.connect.a.a;
import com.inuker.bluetooth.library.connect.b.i;
import com.inuker.bluetooth.library.connect.c.b;

public class a
extends i
implements com.inuker.bluetooth.library.connect.listener.i {
    private static final int p = 1;
    private static final int q = 2;
    private static final int r = 3;
    private static final int s = 4;
    private static final int t = 5;
    private com.inuker.bluetooth.library.connect.a.a u;
    private int v;
    private int w;

    public a(com.inuker.bluetooth.library.connect.a.a a2, b b2) {
        super(b2);
        this.u = a2 != null ? a2 : new a.a().a();
    }

    @Override
    public void i() {
        this.q();
    }

    private void q() {
        this.m.removeCallbacksAndMessages(null);
        this.w = 0;
        switch (this.e()) {
            case 2: {
                this.w();
                break;
            }
            case 0: {
                if (!this.r()) {
                    this.c();
                    break;
                }
                this.m.sendEmptyMessageDelayed(3, (long)this.u.c());
                break;
            }
            case 19: {
                this.B();
            }
        }
    }

    private boolean r() {
        ++this.v;
        return this.b();
    }

    private boolean s() {
        ++this.w;
        return this.d();
    }

    private void t() {
        if (this.v < this.u.a() + 1) {
            this.x();
        } else {
            this.c(-1);
        }
    }

    private void u() {
        if (this.w < this.u.b() + 1) {
            this.y();
        } else {
            this.c();
        }
    }

    private void v() {
        com.inuker.bluetooth.library.e.a.c(String.format("onServiceDiscoverFailed", new Object[0]));
        this.f();
        this.m.sendEmptyMessage(5);
    }

    private void w() {
        com.inuker.bluetooth.library.e.a.c(String.format("processDiscoverService, status = %s", this.l()));
        switch (this.e()) {
            case 2: {
                if (!this.s()) {
                    this.v();
                    break;
                }
                this.m.sendEmptyMessageDelayed(4, (long)this.u.d());
                break;
            }
            case 0: {
                this.t();
                break;
            }
            case 19: {
                this.B();
            }
        }
    }

    private void x() {
        this.b(String.format("retry connect later", new Object[0]));
        this.m.removeCallbacksAndMessages(null);
        this.m.sendEmptyMessageDelayed(1, 1000L);
    }

    private void y() {
        this.b(String.format("retry discover service later", new Object[0]));
        this.m.removeCallbacksAndMessages(null);
        this.m.sendEmptyMessageDelayed(2, 1000L);
    }

    private void z() {
        this.b(String.format("connect timeout", new Object[0]));
        this.m.removeCallbacksAndMessages(null);
        this.c();
    }

    private void A() {
        this.b(String.format("service discover timeout", new Object[0]));
        this.m.removeCallbacksAndMessages(null);
        this.c();
    }

    @Override
    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 1: {
                this.q();
                break;
            }
            case 2: {
                this.w();
                break;
            }
            case 5: {
                this.u();
                break;
            }
            case 3: {
                this.z();
                break;
            }
            case 4: {
                this.A();
            }
        }
        return super.handleMessage(message);
    }

    @Override
    public String toString() {
        return "BleConnectRequest{options=" + this.u + '}';
    }

    @Override
    public void a(boolean bl) {
        this.a();
        this.m.removeMessages(3);
        if (bl) {
            this.m.sendEmptyMessageDelayed(2, 300L);
        } else {
            this.m.removeCallbacksAndMessages(null);
            this.t();
        }
    }

    @Override
    public void a(int n2, c c2) {
        this.a();
        this.m.removeMessages(4);
        if (n2 == 0) {
            this.B();
        } else {
            this.v();
        }
    }

    private void B() {
        c c2 = this.h();
        if (c2 != null) {
            this.a("extra.gatt.profile", (Parcelable)c2);
        }
        this.c(0);
    }
}

