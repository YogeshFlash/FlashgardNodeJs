/*
 * Decompiled with CFR 0.152.
 */
package com.inuker.bluetooth.library.e.a.b;

import java.lang.reflect.Member;
import java.lang.reflect.Modifier;

public class c {
    static boolean a(Member member) {
        return member != null && Modifier.isPublic(member.getModifiers()) && !member.isSynthetic();
    }
}

