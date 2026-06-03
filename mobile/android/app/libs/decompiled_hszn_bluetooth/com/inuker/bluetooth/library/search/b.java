/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Bundle
 *  android.os.Parcelable
 */
package com.inuker.bluetooth.library.search;

import android.os.Bundle;
import android.os.Parcelable;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.c;
import com.inuker.bluetooth.library.search.c.a;
import com.inuker.bluetooth.library.search.g;

public class b {
    public static void a(g g2, final com.inuker.bluetooth.library.connect.c.b b2) {
        c c2 = new c(g2);
        com.inuker.bluetooth.library.search.a.a().a(c2, new a(){

            @Override
            public void a() {
                b2.a(1, null);
            }

            @Override
            public void a(SearchResult searchResult) {
                Bundle bundle = new Bundle();
                bundle.putParcelable("extra.search.result", (Parcelable)searchResult);
                b2.a(4, bundle);
            }

            @Override
            public void b() {
                b2.a(2, null);
            }

            @Override
            public void c() {
                b2.a(3, null);
            }
        });
    }

    public static void a() {
        com.inuker.bluetooth.library.search.a.a().b();
    }
}

