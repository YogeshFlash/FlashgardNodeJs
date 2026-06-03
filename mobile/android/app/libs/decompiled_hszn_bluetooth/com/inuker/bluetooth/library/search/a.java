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
import com.inuker.bluetooth.library.e.b;
import com.inuker.bluetooth.library.e.b.d;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.c;
import com.inuker.bluetooth.library.search.f;
import java.lang.reflect.Method;

public class a
implements Handler.Callback,
com.inuker.bluetooth.library.e.b.b,
f {
    private c a;
    private static f b;
    private Handler c = new Handler(Looper.getMainLooper(), (Handler.Callback)this);

    private a() {
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     * Enabled force condition propagation
     * Lifted jumps to return sites
     */
    public static f a() {
        if (b != null) return b;
        Class<a> clazz = a.class;
        synchronized (a.class) {
            if (b != null) return b;
            a a2 = new a();
            b = (f)d.a((Object)a2, f.class, (com.inuker.bluetooth.library.e.b.b)a2);
            // ** MonitorExit[var0] (shouldn't be in output)
            return b;
        }
    }

    @Override
    public void a(c c2, com.inuker.bluetooth.library.search.c.a a2) {
        c2.a(new a(a2));
        if (!com.inuker.bluetooth.library.e.b.c()) {
            c2.b();
        } else {
            this.b();
            if (this.a == null) {
                this.a = c2;
                this.a.a();
            }
        }
    }

    @Override
    public void b() {
        if (this.a != null) {
            this.a.b();
            this.a = null;
        }
    }

    @Override
    public boolean a(Object object, Method method, Object[] objectArray) {
        this.c.obtainMessage(0, (Object)new com.inuker.bluetooth.library.e.b.a(object, method, objectArray)).sendToTarget();
        return true;
    }

    public boolean handleMessage(Message message) {
        com.inuker.bluetooth.library.e.b.a.a(message.obj);
        return true;
    }

    private class a
    implements com.inuker.bluetooth.library.search.c.a {
        com.inuker.bluetooth.library.search.c.a a;

        a(com.inuker.bluetooth.library.search.c.a a3) {
            this.a = a3;
        }

        @Override
        public void a() {
            this.a.a();
        }

        @Override
        public void a(SearchResult searchResult) {
            this.a.a(searchResult);
        }

        @Override
        public void b() {
            this.a.b();
            a.this.a = null;
        }

        @Override
        public void c() {
            this.a.c();
            a.this.a = null;
        }
    }
}

