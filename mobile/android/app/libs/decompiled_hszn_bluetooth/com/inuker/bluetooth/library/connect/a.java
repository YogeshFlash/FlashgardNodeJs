/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 */
package com.inuker.bluetooth.library.connect;

import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import com.inuker.bluetooth.library.connect.b.c;
import com.inuker.bluetooth.library.connect.b.d;
import com.inuker.bluetooth.library.connect.b.e;
import com.inuker.bluetooth.library.connect.b.f;
import com.inuker.bluetooth.library.connect.b.g;
import com.inuker.bluetooth.library.connect.b.h;
import com.inuker.bluetooth.library.connect.b.i;
import com.inuker.bluetooth.library.connect.b.j;
import com.inuker.bluetooth.library.connect.b.k;
import com.inuker.bluetooth.library.connect.b.l;
import com.inuker.bluetooth.library.connect.c.b;
import com.inuker.bluetooth.library.m;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;

public class a
implements Handler.Callback,
com.inuker.bluetooth.library.connect.e,
m {
    private static final int a = 100;
    private static final int b = 18;
    private List<i> c;
    private i d;
    private com.inuker.bluetooth.library.connect.g e;
    private String f;
    private Handler g;

    public static a a(String string) {
        return new a(string);
    }

    private a(String string) {
        this.f = string;
        this.c = new LinkedList<i>();
        this.e = new com.inuker.bluetooth.library.connect.d(string, this);
        this.g = new Handler(Looper.myLooper(), (Handler.Callback)this);
    }

    public void a(com.inuker.bluetooth.library.connect.a.a a2, b b2) {
        this.b(new com.inuker.bluetooth.library.connect.b.a(a2, b2));
    }

    public void b() {
        this.a();
        com.inuker.bluetooth.library.e.a.e(String.format("Process disconnect", new Object[0]));
        if (this.d != null) {
            this.d.m();
            this.d = null;
        }
        for (i i2 : this.c) {
            i2.m();
        }
        this.c.clear();
        this.e.c();
    }

    public void c() {
        this.b(new h(null));
    }

    public void a(int n2) {
        this.a();
        com.inuker.bluetooth.library.e.a.e(String.format("clearRequest %d", n2));
        LinkedList<i> linkedList = new LinkedList<i>();
        if (n2 == 0) {
            linkedList.addAll(this.c);
        } else {
            for (i i2 : this.c) {
                if (!this.a(i2, n2)) continue;
                linkedList.add(i2);
            }
        }
        for (i i2 : linkedList) {
            i2.m();
        }
        this.c.removeAll(linkedList);
    }

    private boolean a(i i2, int n2) {
        if ((n2 & 1) != 0) {
            return i2 instanceof f;
        }
        if ((n2 & 2) != 0) {
            return i2 instanceof com.inuker.bluetooth.library.connect.b.m || i2 instanceof l;
        }
        if ((n2 & 4) != 0) {
            return i2 instanceof d || i2 instanceof j || i2 instanceof com.inuker.bluetooth.library.connect.b.b;
        }
        if ((n2 & 8) != 0) {
            return i2 instanceof g;
        }
        return false;
    }

    public void a(UUID uUID, UUID uUID2, b b2) {
        this.b(new f(uUID, uUID2, b2));
    }

    public void a(UUID uUID, UUID uUID2, byte[] byArray, b b2) {
        this.b(new com.inuker.bluetooth.library.connect.b.m(uUID, uUID2, byArray, b2));
    }

    public void b(UUID uUID, UUID uUID2, byte[] byArray, b b2) {
        this.b(new l(uUID, uUID2, byArray, b2));
    }

    public void a(UUID uUID, UUID uUID2, UUID uUID3, b b2) {
        this.b(new e(uUID, uUID2, uUID3, b2));
    }

    public void a(UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray, b b2) {
        this.b(new k(uUID, uUID2, uUID3, byArray, b2));
    }

    public void b(UUID uUID, UUID uUID2, b b2) {
        this.b(new d(uUID, uUID2, b2));
    }

    public void c(UUID uUID, UUID uUID2, b b2) {
        this.b(new j(uUID, uUID2, b2));
    }

    public void d(UUID uUID, UUID uUID2, b b2) {
        this.b(new com.inuker.bluetooth.library.connect.b.b(uUID, uUID2, b2));
    }

    public void e(UUID uUID, UUID uUID2, b b2) {
        this.b(new j(uUID, uUID2, b2));
    }

    public void a(b b2) {
        this.b(new g(b2));
    }

    public void a(int n2, b b2) {
        this.b(new c(n2, b2));
    }

    private void b(i i2) {
        this.a();
        if (this.c.size() < 100) {
            i2.a(this);
            i2.a(this.f);
            i2.a(this.e);
            this.c.add(i2);
        } else {
            i2.a(-8);
        }
        this.a(10L);
    }

    @Override
    public void a(i i2) {
        this.a();
        if (i2 != this.d) {
            throw new IllegalStateException("request not match");
        }
        this.d = null;
        this.a(10L);
    }

    private void a(long l2) {
        this.g.sendEmptyMessageDelayed(18, l2);
    }

    private void d() {
        if (this.d != null) {
            return;
        }
        if (!com.inuker.bluetooth.library.e.d.a(this.c)) {
            this.d = this.c.remove(0);
            this.d.a(this);
        }
    }

    @Override
    public void a() {
        if (Thread.currentThread() != this.g.getLooper().getThread()) {
            throw new IllegalStateException("Thread Context Illegal");
        }
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 18: {
                this.d();
            }
        }
        return true;
    }
}

