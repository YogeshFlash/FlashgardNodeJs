/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.Context
 *  android.content.Intent
 *  android.os.Handler
 *  android.os.Looper
 *  android.text.TextUtils
 */
package com.inuker.bluetooth.library.d;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import com.inuker.bluetooth.library.d;
import com.inuker.bluetooth.library.d.a.g;
import com.inuker.bluetooth.library.d.h;
import java.util.Collections;
import java.util.List;

public abstract class a {
    protected Context a;
    protected Handler b;
    protected h c;

    protected a(h h2) {
        this.c = h2;
        this.a = d.a();
        this.b = new Handler(Looper.getMainLooper());
    }

    boolean a(String string) {
        List<String> list = this.a();
        if (!com.inuker.bluetooth.library.e.d.a(list) && !TextUtils.isEmpty((CharSequence)string)) {
            return list.contains(string);
        }
        return false;
    }

    protected List<g> a(Class<?> clazz) {
        List list = this.c.a(clazz);
        return list != null ? list : Collections.EMPTY_LIST;
    }

    abstract List<String> a();

    abstract boolean a(Context var1, Intent var2);
}

