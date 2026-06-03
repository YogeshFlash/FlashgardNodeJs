/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothDevice
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 */
package com.inuker.bluetooth.library.search;

import android.bluetooth.BluetoothDevice;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import com.inuker.bluetooth.library.e.b;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.d;
import com.inuker.bluetooth.library.search.g;
import com.inuker.bluetooth.library.search.h;
import java.util.ArrayList;
import java.util.List;

public class c
implements Handler.Callback {
    private static final int a = 100;
    private static final int b = 17;
    private static final int c = 18;
    private List<d> d = new ArrayList<d>();
    private com.inuker.bluetooth.library.search.c.a e;
    private d f;
    private Handler g;

    public c(g g2) {
        List<h> list = g2.a();
        for (h h2 : list) {
            this.d.add(new d(h2));
        }
        this.g = new Handler(Looper.myLooper(), (Handler.Callback)this);
    }

    public void a(com.inuker.bluetooth.library.search.c.a a2) {
        this.e = a2;
    }

    public void a() {
        if (this.e != null) {
            this.e.a();
        }
        this.d();
        this.g.sendEmptyMessageDelayed(17, 100L);
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 17: {
                this.c();
                break;
            }
            case 18: {
                SearchResult searchResult = (SearchResult)message.obj;
                if (this.e == null) break;
                this.e.a(searchResult);
            }
        }
        return true;
    }

    private void c() {
        if (this.d.size() > 0) {
            this.f = this.d.remove(0);
            this.f.a(new a(this.f));
        } else {
            this.f = null;
            if (this.e != null) {
                this.e.b();
            }
        }
    }

    public void b() {
        if (this.f != null) {
            this.f.c();
            this.f = null;
        }
        this.d.clear();
        if (this.e != null) {
            this.e.c();
        }
        this.e = null;
    }

    private void d() {
        boolean bl = false;
        boolean bl2 = false;
        for (d d2 : this.d) {
            if (d2.a()) {
                bl = true;
                continue;
            }
            if (d2.b()) {
                bl2 = true;
                continue;
            }
            throw new IllegalArgumentException("unknown search task type!");
        }
        if (bl) {
            this.e();
        }
        if (bl2) {
            this.f();
        }
    }

    private void e() {
        List<BluetoothDevice> list = com.inuker.bluetooth.library.e.b.i();
        for (BluetoothDevice bluetoothDevice : list) {
            this.a(new SearchResult(bluetoothDevice));
        }
    }

    private void f() {
        List<BluetoothDevice> list = com.inuker.bluetooth.library.e.b.j();
        for (BluetoothDevice bluetoothDevice : list) {
            this.a(new SearchResult(bluetoothDevice));
        }
    }

    private void a(SearchResult searchResult) {
        this.g.obtainMessage(18, (Object)searchResult).sendToTarget();
    }

    public String toString() {
        StringBuilder stringBuilder = new StringBuilder();
        for (d d2 : this.d) {
            stringBuilder.append(d2.toString() + ", ");
        }
        return stringBuilder.toString();
    }

    private class a
    implements com.inuker.bluetooth.library.search.c.a {
        d a;

        a(d d2) {
            this.a = d2;
        }

        @Override
        public void a() {
            com.inuker.bluetooth.library.e.a.c(String.format("%s onSearchStarted", this.a));
        }

        @Override
        public void a(SearchResult searchResult) {
            com.inuker.bluetooth.library.e.a.c(String.format("onDeviceFounded %s", searchResult));
            c.this.a(searchResult);
        }

        @Override
        public void b() {
            com.inuker.bluetooth.library.e.a.c(String.format("%s onSearchStopped", this.a));
            c.this.g.sendEmptyMessageDelayed(17, 100L);
        }

        @Override
        public void c() {
            com.inuker.bluetooth.library.e.a.c(String.format("%s onSearchCanceled", this.a));
        }
    }
}

