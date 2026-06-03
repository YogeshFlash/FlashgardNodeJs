/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.bluetooth.BluetoothAdapter
 */
package com.inuker.bluetooth.library.search;

import android.bluetooth.BluetoothAdapter;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.c.a;

public class e {
    protected BluetoothAdapter a;
    protected a b;

    public static e a(int n2) {
        switch (n2) {
            case 1: {
                return com.inuker.bluetooth.library.search.a.a.c();
            }
            case 2: {
                return com.inuker.bluetooth.library.search.b.a.c();
            }
        }
        throw new IllegalStateException(String.format("unknown search type %d", n2));
    }

    protected void a(a a2) {
        this.b = a2;
        this.c();
    }

    protected void a() {
        this.d();
        this.b = null;
    }

    protected void b() {
        this.e();
        this.b = null;
    }

    private void c() {
        if (this.b != null) {
            this.b.a();
        }
    }

    protected void a(SearchResult searchResult) {
        if (this.b != null) {
            this.b.a(searchResult);
        }
    }

    private void d() {
        if (this.b != null) {
            this.b.b();
        }
    }

    private void e() {
        if (this.b != null) {
            this.b.c();
        }
    }
}

